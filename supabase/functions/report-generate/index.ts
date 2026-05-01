// supabase/functions/report-generate/index.ts
// Async PDF detailed-report generation. Triggered by stripe-webhook after a
// PDF Checkout session completes. Spec:
//   - docs/PLAN.md §13       (product spec)
//   - docs/TECH_SPEC.md §14  (implementation)
//   - .trellis/spec/supabase/edge-functions.md (async pattern + state machine)
//
// Trigger contract: POST { report_id } with service_role bearer token. The
// stripe-webhook function calls this fire-and-forget; this function 202s
// immediately and runs generation in the background.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'npm:stripe@17.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderToBuffer } from 'npm:@react-pdf/renderer@3.4.0'

import { json, serviceClient } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llm.ts'
import {
  buildChartCachePrefix,
  loadPromptTemplate,
  SYSTEM_PROMPT_FORTUNE_SCHOLAR,
} from '../_shared/prompts.ts'
import { runRedlineChecks, withDisclaimer } from '../_shared/redline.ts'
import { chaptersForType, resolvePromptVersion } from './chapters.ts'
import { ReportPDF, type ReportPDFProps } from './pdf-render.tsx'

const BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET_REPORTS') ?? 'reports'
const TTL_SECONDS = parseInt(Deno.env.get('PDF_SIGNED_URL_TTL_SECONDS') ?? '86400', 10)

function stripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-12-18.acacia',
  })
}

function resend(): Resend {
  return new Resend(Deno.env.get('RESEND_API_KEY')!)
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // Restrict invocation to service_role bearer (stripe-webhook or admin tools)
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return json({ error: 'forbidden' }, 403)
  }

  let body: { report_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 422)
  }
  if (!body.report_id) return json({ error: 'invalid_request' }, 422)

  const supabase = serviceClient()

  // Atomically transition paid -> generating (prevents double-processing)
  const { data: report, error } = await supabase
    .from('reports')
    .update({
      status: 'generating',
      generation_started_at: new Date().toISOString(),
    })
    .eq('id', body.report_id)
    .eq('status', 'paid')
    .select('*, charts!inner(*), profiles!inner(email, display_name, locale)')
    .maybeSingle()

  if (error) {
    console.error('[report-generate] state transition failed:', error)
    return json({ error: 'transition_failed' }, 500)
  }
  if (!report) {
    // Either not paid yet, or already in progress / done. Idempotent ack.
    return json({ ok: true, skipped: true })
  }

  // Fire-and-forget background work. We return 202 immediately so Stripe's
  // upstream caller (stripe-webhook) doesn't block.
  generateReport(report).catch(async (e) => {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[report-generate] async failure:', msg)
    await supabase
      .from('reports')
      .update({
        status: 'failed',
        error_message: msg.slice(0, 500),
        retry_count: (report.retry_count ?? 0) + 1,
      })
      .eq('id', report.id)
    await scheduleAutoRefund(report)
  })

  return json({ ok: true, status: 'generating' }, 202)
})

// =============================================================================
// Generation pipeline
// =============================================================================

type ReportRow = {
  id: string
  user_id: string
  chart_id: string
  type: string
  status: string
  retry_count: number | null
  amount_usd: number | null
  stripe_payment_intent_id: string | null
  charts: {
    id: string
    type: string
    chart_data: unknown
    input_data: { solar?: string; lunar?: string; timezone?: string; gender?: string } & Record<string, unknown>
  }
  profiles: { email: string | null; display_name: string | null; locale: string | null }
}

async function generateReport(report: ReportRow): Promise<void> {
  const supabase = serviceClient()
  const chapters = chaptersForType(report.type)
  if (chapters.length === 0) {
    throw new Error(`unsupported_report_type:${report.type}`)
  }

  const chartCachePrefix = buildChartCachePrefix({
    chartType: report.charts.type,
    chartData: report.charts.chart_data,
    // input_data may carry solar/lunar/timezone/gender (no plaintext PII)
    inputData: stripPIIFromInputData(report.charts.input_data),
  })

  const sections: Array<{ id: string; title: string; text: string }> = []
  let totalIn = 0
  let totalOut = 0
  let totalCacheRead = 0
  let totalCost = 0
  const providersUsed = new Set<string>()

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    const versionId = resolvePromptVersion(chapter.promptVersionPrefix)
    const template = await loadPromptTemplate(versionId)

    // Quality on PDFs is non-negotiable → always go through Pro tier (Claude).
    // Fallback chain still applies (claude → openai → deepseek), but we record
    // when fallback happened so customer service can flag for QA review.
    const result = await callLLM('pro', {
      prompt: template,
      cachePrefix: chartCachePrefix,
      systemPrompt: SYSTEM_PROMPT_FORTUNE_SCHOLAR,
      maxTokens: chapter.maxTokens,
    })

    const cleaned = withDisclaimer(result.text, report.profiles.locale ?? 'zh-CN')
    sections.push({ id: chapter.id, title: chapter.title, text: cleaned })
    totalIn += result.tokensInput
    totalOut += result.tokensOutput
    totalCacheRead += result.cacheReadTokens
    totalCost += result.costUsd
    providersUsed.add(result.provider)

    await supabase
      .from('reports')
      .update({
        progress: Math.round(((i + 1) / chapters.length) * 95), // reserve 5% for render+upload
        sections,
      })
      .eq('id', report.id)
  }

  // Redline check across the whole report
  const fullText = sections.map((s) => `${s.title}\n${s.text}`).join('\n\n')
  const redline = runRedlineChecks(fullText)
  if (redline.score < 60) {
    throw new Error(`quality_check_failed:score=${redline.score}:flags=${redline.flags.length}`)
  }

  // Render PDF
  await supabase.from('reports').update({ progress: 95 }).eq('id', report.id)
  const pdfProps: ReportPDFProps = {
    reportId: report.id,
    reportType: report.type,
    reportNumber: report.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    displayName: report.profiles.display_name,
    birthSummary: formatBirthSummary(report.charts.input_data),
    sections,
    chartAppendixText: formatChartAppendix(report.charts.chart_data),
    locale: (report.profiles.locale ?? 'zh-CN') as ReportPDFProps['locale'],
  }
  const pdfBuffer = await renderToBuffer(ReportPDF(pdfProps))

  // Upload to Storage (private bucket, owned by user_id folder)
  const path = `${report.user_id}/${report.id}.pdf`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (upErr) throw new Error(`storage_upload_failed:${upErr.message}`)

  const providerSummary = Array.from(providersUsed).join(',')
  await supabase
    .from('reports')
    .update({
      status: 'ready',
      progress: 100,
      pdf_url: path,
      pdf_size_bytes: pdfBuffer.byteLength,
      model_used: providerSummary,
      total_tokens_input: totalIn,
      total_tokens_output: totalOut,
      total_cost_usd: totalCost,
      quality_score: redline.score,
      ready_at: new Date().toISOString(),
    })
    .eq('id', report.id)

  await supabase.rpc('consume_pdf_quota', { p_user_id: report.user_id })

  // Send notification email with signed download URL
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TTL_SECONDS)

  if (signed?.signedUrl && report.profiles.email) {
    await resend().emails.send({
      from: 'BaziLens <reports@bazilens.app>',
      to: report.profiles.email,
      subject: '您的八字详批报告已生成',
      html: emailTemplate({
        displayName: report.profiles.display_name,
        downloadUrl: signed.signedUrl,
        ttlHours: Math.round(TTL_SECONDS / 3600),
        reportNumber: report.id.slice(0, 8).toUpperCase(),
      }),
    })
  }
}

async function scheduleAutoRefund(report: ReportRow): Promise<void> {
  const supabase = serviceClient()
  if (!report.stripe_payment_intent_id) return

  // Auto refund only after retry exhaustion (≥2 failures) — first failure stays
  // in 'failed' so cron / human can decide. Sprint 1 keeps it simple: refund
  // immediately on any failure since we don't have a retry cron yet.
  try {
    const stripe = stripeClient()
    const refund = await stripe.refunds.create({
      payment_intent: report.stripe_payment_intent_id,
      reason: 'requested_by_customer',
    })
    await supabase
      .from('reports')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refund_amount_usd: report.amount_usd ?? null,
        refund_reason: 'generation_failed',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', report.id)

    if (report.profiles?.email) {
      await resend().emails.send({
        from: 'BaziLens <support@bazilens.app>',
        to: report.profiles.email,
        subject: '关于您的详批报告 — 已退款',
        html: refundEmailTemplate({
          displayName: report.profiles.display_name,
          amount: report.amount_usd ?? 0,
        }),
      })
    }
  } catch (e) {
    console.error('[report-generate] auto refund failed:', e)
  }
}

// =============================================================================
// Helpers
// =============================================================================

function stripPIIFromInputData(input: ReportRow['charts']['input_data']): Record<string, unknown> {
  // Defence-in-depth: input_data shouldn't contain plaintext birth_time /
  // birth_place anyway (those are encrypted), but if upstream code regresses,
  // strip here before sending to LLM.
  const copy: Record<string, unknown> = { ...input }
  delete copy.birth_time
  delete copy.birth_place
  delete copy.full_name
  return copy
}

function formatBirthSummary(input: ReportRow['charts']['input_data']): string {
  const parts: string[] = []
  if (input.solar) parts.push(`阳历 ${String(input.solar)}`)
  if (input.lunar) parts.push(`阴历 ${String(input.lunar)}`)
  if (input.timezone) parts.push(String(input.timezone))
  return parts.join(' · ') || '出生信息已加密'
}

function formatChartAppendix(chartData: unknown): string {
  const json = JSON.stringify(chartData, null, 2)
  // Cap to keep the appendix readable; trim long arrays.
  if (json.length > 4000) return `${json.slice(0, 4000)}\n... (truncated)`
  return json
}

function emailTemplate(p: {
  displayName: string | null
  downloadUrl: string
  ttlHours: number
  reportNumber: string
}): string {
  const name = p.displayName ? `${p.displayName} 您好，` : '您好，'
  return `
<div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 24px;">
  <p>${name}</p>
  <p>您订购的「八字详批 · 一生总论」（编号 ${p.reportNumber}）已生成完毕。</p>
  <p style="margin: 24px 0;">
    <a href="${p.downloadUrl}"
       style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
      立即下载
    </a>
  </p>
  <p>下载链接 ${p.ttlHours} 小时内有效。如需重新下载，请登录后进入「我的报告」。</p>
  <p style="font-size: 12px; color: #666; margin-top: 32px;">
    本报告基于传统命理研究，仅供文化参考与个人探索，不构成医疗、法律、财务、投资或心理咨询建议。
  </p>
</div>
`
}

function refundEmailTemplate(p: { displayName: string | null; amount: number }): string {
  const name = p.displayName ? `${p.displayName} 您好，` : '您好，'
  return `
<div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 24px;">
  <p>${name}</p>
  <p>很抱歉，您订购的报告生成过程中遇到问题，我们已为您全额退款 $${p.amount.toFixed(2)}。
     退款将在 5-10 个工作日内退回您的支付方式。</p>
  <p>如有任何疑问，请直接回复此邮件。</p>
  <p style="font-size: 12px; color: #666; margin-top: 32px;">— BaziLens 团队</p>
</div>
`
}
