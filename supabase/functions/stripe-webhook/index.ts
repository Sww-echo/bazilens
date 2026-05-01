// supabase/functions/stripe-webhook/index.ts
// Handles Stripe events for both subscriptions and one-shot PDF payments.
// Spec: docs/TECH_SPEC.md §6.3 + §14.2.
//
// IMPORTANT: signature verification MUST run before any DB write.
// JWT verification is intentionally OFF for this endpoint (Stripe is the caller).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'npm:stripe@17.0.0'

import { json, serviceClient } from '../_shared/cors.ts'

function stripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-12-18.acacia',
  })
}

const LOOKUP_TO_TIER: Record<string, 'plus' | 'pro'> = {
  plus_monthly: 'plus',
  plus_yearly: 'plus',
  pro_monthly: 'pro',
  pro_yearly: 'pro',
}

function priceLookupToTier(price: Stripe.Price | undefined | null): 'plus' | 'pro' | null {
  const key = price?.lookup_key
  if (!key) return null
  return LOOKUP_TO_TIER[key] ?? null
}

async function triggerReportGenerate(reportId: string): Promise<void> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/report-generate`
  // Fire-and-forget — Stripe needs us to ack within seconds.
  fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ report_id: reportId }),
  }).catch((err) => console.error('[trigger report-generate]', err))
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const stripe = stripeClient()
  const supabase = serviceClient()

  const sig = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!sig || !webhookSecret) {
    return json({ error: 'missing_signature' }, 400)
  }

  let event: Stripe.Event
  const rawBody = await req.text()
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
  } catch (e) {
    console.error('[stripe-webhook] signature verification failed:', e)
    return json({ error: 'signature_invalid' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}
        const userId = meta.user_id

        if (!userId) {
          console.warn('[stripe-webhook] checkout.session.completed missing user_id metadata', session.id)
          break
        }

        if (meta.kind === 'pdf') {
          // Insert reports row in 'paid' state, then trigger async generation.
          const reportType = meta.report_type as string | undefined
          const chartId = meta.chart_id as string | undefined
          if (!reportType || !chartId) {
            console.error('[stripe-webhook] pdf checkout missing report_type/chart_id', session.id)
            break
          }
          const { data: existing } = await supabase
            .from('reports')
            .select('id, status')
            .eq('stripe_checkout_session_id', session.id)
            .maybeSingle()
          if (existing) {
            // Idempotency — ignore replays
            break
          }
          const paymentIntent = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id
          const { data: report, error } = await supabase
            .from('reports')
            .insert({
              user_id: userId,
              chart_id: chartId,
              type: reportType,
              status: 'paid',
              paid_at: new Date().toISOString(),
              amount_usd: session.amount_total != null ? session.amount_total / 100 : null,
              stripe_payment_intent_id: paymentIntent ?? null,
              stripe_checkout_session_id: session.id,
            })
            .select()
            .single()
          if (error || !report) {
            console.error('[stripe-webhook] insert report failed:', error)
            break
          }
          await triggerReportGenerate(report.id)
        }
        // Subscription kind — nothing to do here; customer.subscription.* covers it.
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const s = event.data.object as Stripe.Subscription
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer.id
        const item = s.items.data[0]
        const tier = priceLookupToTier(item?.price) ?? 'free'

        await supabase
          .from('subscriptions')
          .update({
            tier,
            source: 'stripe',
            stripe_subscription_id: s.id,
            stripe_customer_id: customerId,
            current_period_start: s.current_period_start
              ? new Date(s.current_period_start * 1000).toISOString()
              : null,
            current_period_end: s.current_period_end
              ? new Date(s.current_period_end * 1000).toISOString()
              : null,
            status: mapSubStatus(s.status),
            cancel_at_period_end: s.cancel_at_period_end,
            raw: s as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const s = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({
            tier: 'free',
            status: 'expired',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', s.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id
        if (!piId) break
        // Mark associated PDF report (if any) as refunded
        await supabase
          .from('reports')
          .update({
            status: 'refunded',
            refund_id: charge.refunds?.data[0]?.id ?? null,
            refund_amount_usd:
              charge.amount_refunded != null ? charge.amount_refunded / 100 : null,
            refund_reason: charge.refunds?.data[0]?.reason ?? null,
            refunded_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', piId)
        break
      }

      default:
        // No-op for events we don't handle yet.
        break
    }
  } catch (e) {
    console.error('[stripe-webhook] handler failed:', event.type, e)
    // Return 500 → Stripe retries
    return json({ error: 'handler_failed' }, 500)
  }

  return json({ received: true })
})

function mapSubStatus(s: Stripe.Subscription.Status): string {
  if (s === 'active') return 'active'
  if (s === 'trialing') return 'trialing'
  if (s === 'past_due') return 'past_due'
  if (s === 'canceled' || s === 'unpaid' || s === 'incomplete_expired') return 'canceled'
  return 'active'
}
