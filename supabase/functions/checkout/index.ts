// supabase/functions/checkout/index.ts
// Creates Stripe Checkout sessions for both subscription tiers and one-shot PDF.
// Spec: docs/TECH_SPEC.md §6.2 + §14.1, .trellis/spec/supabase/edge-functions.md.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'npm:stripe@17.0.0'

import { json, preflight, requireAuth, serviceClient } from '../_shared/cors.ts'

type CheckoutRequest =
  | {
      kind: 'subscription'
      // Stripe lookup_key for subscription Price (e.g. "plus_monthly", "pro_yearly")
      lookup_key: 'plus_monthly' | 'plus_yearly' | 'pro_monthly' | 'pro_yearly'
    }
  | {
      kind: 'pdf'
      // PDF report SKU; backend maps to Stripe Price lookup
      report_type: 'full_bazi' | 'liunian' | 'compatibility' | 'ziwei_full'
      chart_id: string
    }

// Map PDF SKU -> Stripe Price lookup_key. Sprint 1 ships only full_bazi.
const PDF_LOOKUP_KEYS: Record<string, string> = {
  full_bazi: 'pdf_full_bazi',
  liunian: 'pdf_liunian',
  compatibility: 'pdf_compatibility',
  ziwei_full: 'pdf_ziwei_full',
}

function stripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' })
}

serve(async (req: Request) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  let body: CheckoutRequest
  try {
    body = (await req.json()) as CheckoutRequest
  } catch {
    return json({ error: 'invalid_json' }, 422)
  }

  const stripe = stripeClient()
  const supabase = serviceClient()
  const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  // Resolve / create Stripe customer (one customer per user)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = sub?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId, source: 'stripe' })
      .eq('user_id', user.id)
  }

  if (body.kind === 'subscription') {
    if (
      !['plus_monthly', 'plus_yearly', 'pro_monthly', 'pro_yearly'].includes(body.lookup_key)
    ) {
      return json({ error: 'invalid_lookup_key' }, 422)
    }
    const prices = await stripe.prices.list({
      lookup_keys: [body.lookup_key],
      expand: ['data.product'],
      active: true,
    })
    const price = prices.data[0]
    if (!price) return json({ error: 'price_not_configured' }, 500)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${APP_URL}/account/subscription?ok=1`,
      cancel_url: `${APP_URL}/upgrade`,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        kind: 'subscription',
        lookup_key: body.lookup_key,
      },
      subscription_data: {
        metadata: { user_id: user.id, lookup_key: body.lookup_key },
      },
    })
    return json({ ok: true, url: session.url })
  }

  if (body.kind === 'pdf') {
    if (!body.chart_id || !body.report_type) {
      return json({ error: 'invalid_request' }, 422)
    }
    const lookupKey = PDF_LOOKUP_KEYS[body.report_type]
    if (!lookupKey) return json({ error: 'unsupported_report_type' }, 422)

    // Verify chart belongs to user (defence in depth, RLS already enforces)
    const { data: chart } = await supabase
      .from('charts')
      .select('id')
      .eq('id', body.chart_id)
      .eq('user_id', user.id)
      .single()
    if (!chart) return json({ error: 'chart_not_found' }, 404)

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product'],
      active: true,
    })
    const price = prices.data[0]
    if (!price) return json({ error: 'pdf_price_not_configured' }, 500)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${APP_URL}/report/pending?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/chart/${body.chart_id}`,
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          kind: 'pdf',
          report_type: body.report_type,
          chart_id: body.chart_id,
        },
      },
      metadata: {
        user_id: user.id,
        kind: 'pdf',
        report_type: body.report_type,
        chart_id: body.chart_id,
      },
    })
    return json({ ok: true, url: session.url })
  }

  return json({ error: 'unsupported_kind' }, 422)
})

/**
 * Customer Portal: separate route, but we expose it from this same function for
 * simplicity. Front-end calls this with `?action=portal`.
 */
export async function customerPortal(req: Request): Promise<Response> {
  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  const supabase = serviceClient()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()
  if (!sub?.stripe_customer_id) return json({ error: 'no_customer' }, 404)

  const stripe = stripeClient()
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/account`,
  })
  return json({ ok: true, url: portal.url })
}
