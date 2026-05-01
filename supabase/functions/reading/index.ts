// supabase/functions/reading/index.ts
// Streams an AI fortune-telling reading via SSE. Spec:
//   - .trellis/spec/supabase/edge-functions.md (skeleton + streaming)
//   - .trellis/spec/supabase/llm-routing.md   (tier routing + fallback)
//   - .trellis/spec/guides/privacy-pii.md     (DeepSeek PII boundary, encrypt question)
//   - docs/TECH_SPEC.md §4

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  corsHeaders,
  json,
  preflight,
  requireAuth,
  serviceClient,
} from '../_shared/cors.ts'
import { callLLMStream, expectedProviderForTier, type Tier } from '../_shared/llm.ts'
import {
  consumeReadingQuota,
  rollbackReadingQuota,
} from '../_shared/quota.ts'
import {
  buildChartCachePrefix,
  loadPromptTemplate,
  renderTemplate,
  SYSTEM_PROMPT_FORTUNE_SCHOLAR,
} from '../_shared/prompts.ts'
import { encryptPIIOrNull } from '../_shared/crypto.ts'
import { detectPII } from '../_shared/pii-sanitize.ts'
import { runRedlineChecks, withDisclaimer } from '../_shared/redline.ts'

type ReadingRequest = {
  chart_id: string
  scene: string
  question?: string
  prompt_version: string
}

const ALLOWED_TIERS = ['free', 'plus', 'pro'] as const

function isTier(t: unknown): t is Tier {
  return typeof t === 'string' && (ALLOWED_TIERS as readonly string[]).includes(t)
}

serve(async (req: Request) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  // 1. Auth
  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  // 2. Parse body
  let body: ReadingRequest
  try {
    body = (await req.json()) as ReadingRequest
  } catch {
    return json({ error: 'invalid_json' }, 422)
  }
  if (!body.chart_id || !body.scene || !body.prompt_version) {
    return json({ error: 'invalid_request', details: ['chart_id', 'scene', 'prompt_version'] }, 422)
  }
  const question = (body.question ?? '').slice(0, 500) // length cap per TECH_SPEC §13

  const supabase = serviceClient()

  // 3. Subscription tier
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', user.id)
    .single()
  const tier: Tier = (sub && sub.status === 'active' && isTier(sub.tier) ? sub.tier : 'free')

  // 4. PII guard for Free tier (DeepSeek boundary)
  if (tier === 'free' && question.length > 0) {
    const detection = detectPII(question)
    if (detection.hasPII) {
      return json(
        {
          error: 'pii_detected',
          message: 'Free tier does not support questions containing personal information. Please upgrade to Plus.',
          detected_types: detection.matches.map((m) => m.type),
        },
        400,
      )
    }
  }

  // 5. Load chart
  const { data: chart, error: chartErr } = await supabase
    .from('charts')
    .select('*')
    .eq('id', body.chart_id)
    .eq('user_id', user.id)
    .single()
  if (chartErr || !chart) return json({ error: 'chart_not_found' }, 404)

  // 6. Load prompt template
  let template: string
  try {
    template = await loadPromptTemplate(body.prompt_version)
  } catch (e) {
    return json({ error: 'prompt_template_unavailable', details: String(e) }, 422)
  }

  // 7. Atomic quota deduction
  const quota = await consumeReadingQuota(supabase, user.id, tier)
  if (!quota.ok) return json({ error: quota.reason, remaining: 0 }, 402)

  // 8. Build prompt
  const cachePrefix = buildChartCachePrefix({
    chartType: chart.type,
    chartData: chart.chart_data,
    inputData: chart.input_data,
  })
  const renderedPrompt = renderTemplate(template, {
    chart,
    scene: body.scene,
    question,
  })

  // 9. Insert reading row in 'streaming' state with encrypted question
  const questionEnc = await encryptPIIOrNull(question)
  const { data: reading, error: insertErr } = await supabase
    .from('readings')
    .insert({
      user_id: user.id,
      chart_id: body.chart_id,
      scene: body.scene,
      question_enc: questionEnc,
      prompt: { template: body.prompt_version, rendered_chars: renderedPrompt.length },
      prompt_version: body.prompt_version,
      status: 'streaming',
    })
    .select()
    .single()
  if (insertErr || !reading) {
    await rollbackReadingQuota(supabase, user.id)
    return json({ error: 'reading_insert_failed', details: insertErr?.message }, 500)
  }

  // 10. Stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let aggregated = ''
      let resolvedProvider: string | null = null

      try {
        const result = await callLLMStream(
          tier,
          {
            prompt: renderedPrompt,
            systemPrompt: SYSTEM_PROMPT_FORTUNE_SCHOLAR,
            cachePrefix,
            maxTokens: 4000,
          },
          (delta) => {
            aggregated += delta
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`),
            )
          },
        )
        resolvedProvider = result.provider
        const finalText = withDisclaimer(aggregated || result.text, 'zh-CN')

        // Quality check (best-effort; we don't block reading on this)
        const redline = runRedlineChecks(finalText)

        // Persist final state
        const expected = expectedProviderForTier(tier)
        const fellBack = result.provider !== expected
        if (fellBack) {
          // Don't charge user for fallback experience
          await rollbackReadingQuota(supabase, user.id)
        }

        await supabase
          .from('readings')
          .update({
            response: finalText,
            tokens_input: result.tokensInput,
            tokens_output: result.tokensOutput,
            cache_read_tokens: result.cacheReadTokens,
            cost_usd: result.costUsd,
            model: `${result.provider}:${result.model}`,
            status: 'completed',
            error_message: fellBack ? `fallback: ${expected} -> ${result.provider}` : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', reading.id)

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              reading_id: reading.id,
              provider: result.provider,
              fell_back: fellBack,
              quality_score: redline.score,
            })}\n\n`,
          ),
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[reading] stream failed:', msg)
        await supabase
          .from('readings')
          .update({
            status: 'failed',
            error_message: msg.slice(0, 500),
            completed_at: new Date().toISOString(),
          })
          .eq('id', reading.id)
        // Roll back quota when no provider succeeded.
        if (!resolvedProvider) {
          await rollbackReadingQuota(supabase, user.id)
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'stream_failed' })}\n\n`),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      ...corsHeaders(),
    },
  })
})
