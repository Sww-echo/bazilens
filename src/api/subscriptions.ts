// Subscriptions API — read state, create Stripe Checkout, open Customer Portal.
// Spec: docs/TECH_SPEC.md §6, .trellis/spec/supabase/edge-functions.md.

import { supabase } from './client'
import type { Tier, SubscriptionStatus } from '../stores/subscriptionStore'

export type SubscriptionRow = {
  user_id: string
  tier: Tier
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export async function fetchMySubscription(): Promise<SubscriptionRow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'user_id, tier, status, current_period_start, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id',
    )
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return (data as SubscriptionRow | null) ?? null
}

export type CheckoutLookupKey =
  | 'plus_monthly' | 'plus_yearly'
  | 'pro_monthly' | 'pro_yearly'

export async function startSubscriptionCheckout(lookup_key: CheckoutLookupKey): Promise<{ url: string }> {
  return invokeCheckout({ kind: 'subscription', lookup_key })
}

export async function startPDFCheckout(report_type: 'full_bazi' | 'liunian' | 'compatibility' | 'ziwei_full', chart_id: string): Promise<{ url: string }> {
  return invokeCheckout({ kind: 'pdf', report_type, chart_id })
}

async function invokeCheckout(body: unknown): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.url) throw new Error(j.error ?? `http_${r.status}`)
  return { url: j.url as string }
}

/**
 * Open Stripe Customer Portal for managing existing subscription
 * (cancel / change card / view invoices). Caller redirects to the returned url.
 */
export async function openCustomerPortal(): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout?action=portal`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'portal' }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.url) throw new Error(j.error ?? `http_${r.status}`)
  return { url: j.url as string }
}
