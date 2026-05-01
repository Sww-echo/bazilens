// supabase/functions/account-delete/index.ts
// GDPR Art. 17 — schedule account deletion with 30-day grace period.
// Spec: docs/PLAN.md §15.7 + docs/TECH_SPEC.md §16.4.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'npm:stripe@17.0.0'
import { Resend } from 'npm:resend@4.0.0'

import { json, preflight, requireAuth, serviceClient } from '../_shared/cors.ts'

const GRACE_PERIOD_DAYS = 30

serve(async (req: Request) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  let body: { confirm?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 422)
  }
  if (!body.confirm) return json({ error: 'confirmation_required' }, 400)

  const supabase = serviceClient()

  // 1. Cancel any active subscription immediately (no proration; user already
  // wants out). Stripe will fire customer.subscription.deleted via webhook.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .single()
  if (sub?.stripe_subscription_id && sub.status === 'active') {
    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2024-12-18.acacia',
      })
      await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
        invoice_now: false,
        prorate: false,
      })
    } catch (e) {
      console.error('[account-delete] stripe cancel failed (non-fatal):', e)
    }
  }

  // 2. Schedule deletion + freeze the account
  const scheduledDeleteAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 86_400_000)
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      status: 'pending_deletion',
      scheduled_delete_at: scheduledDeleteAt.toISOString(),
    })
    .eq('id', user.id)
  if (updateErr) {
    return json({ error: 'profile_update_failed', details: updateErr.message }, 500)
  }

  // 3. Sign out everywhere
  try {
    await supabase.auth.admin.signOut(user.id, 'global')
  } catch (e) {
    console.error('[account-delete] global sign-out failed (non-fatal):', e)
  }

  // 4. Confirmation email
  if (user.email) {
    try {
      await new Resend(Deno.env.get('RESEND_API_KEY')!).emails.send({
        from: 'BaziLens <support@bazilens.app>',
        to: user.email,
        subject: '账号注销请求已收到',
        html: confirmationEmail({
          scheduledDeleteAt,
          appUrl: Deno.env.get('APP_URL') ?? 'https://bazilens.app',
        }),
      })
    } catch (e) {
      console.error('[account-delete] confirmation email failed (non-fatal):', e)
    }
  }

  return json({
    ok: true,
    scheduled_delete_at: scheduledDeleteAt.toISOString(),
    grace_period_days: GRACE_PERIOD_DAYS,
  })
})

function confirmationEmail(p: { scheduledDeleteAt: Date; appUrl: string }): string {
  const dateStr = p.scheduledDeleteAt.toLocaleDateString('zh-CN')
  return `
<div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 24px;">
  <p>您好，</p>
  <p>我们已收到您的账号注销请求。账号将在 <strong>${dateStr}</strong> 永久删除。</p>
  <p>30 天内重新登录可自动恢复账号。如非本人操作，请立即<a href="${p.appUrl}/account">登录撤销</a>。</p>
  <p>注销后将永久删除：所有命盘、解读历史、PDF 报告、客服工单。</p>
  <p>财务记录（订阅、退款）将匿名化保留 7 年（税务合规要求）。</p>
  <p style="font-size: 12px; color: #666; margin-top: 24px;">— BaziLens 团队</p>
</div>
`
}
