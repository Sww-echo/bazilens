// supabase/functions/data-export/index.ts
// GDPR Art. 15 + Art. 20 — user data export.
// Returns a JSON archive of all data tied to the authenticated user, with PII
// fields decrypted. Spec: docs/PLAN.md §15.7 + .trellis/spec/guides/privacy-pii.md.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { json, preflight, requireAuth, serviceClient } from '../_shared/cors.ts'
import { decryptPIIOrNull } from '../_shared/crypto.ts'

serve(async (req: Request) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  const supabase = serviceClient()

  const [profileR, chartsR, readingsR, reportsR, subsR, ticketsR, quotaR] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('charts').select('*').eq('user_id', user.id),
    supabase.from('readings').select('*').eq('user_id', user.id),
    supabase
      .from('reports')
      .select(
        'id, type, status, paid_at, amount_usd, ready_at, user_rating, user_feedback, refund_id, refund_amount_usd, created_at',
      )
      .eq('user_id', user.id),
    supabase.from('subscriptions').select('*').eq('user_id', user.id),
    supabase.from('support_tickets').select('*').eq('user_id', user.id),
    supabase.from('usage_quotas').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  // Decrypt PII fields for the user's own export
  const decryptedCharts = await Promise.all(
    (chartsR.data ?? []).map(async (c) => ({
      ...c,
      input_data: {
        ...(c.input_data as Record<string, unknown>),
        birth_time: await decryptPIIOrNull(
          (c.input_data as Record<string, string | undefined>).birth_time_enc ?? null,
        ),
        birth_place: await decryptPIIOrNull(
          (c.input_data as Record<string, string | undefined>).birth_place_enc ?? null,
        ),
      },
    })),
  )

  const decryptedReadings = await Promise.all(
    (readingsR.data ?? []).map(async (r) => ({
      ...r,
      question: await decryptPIIOrNull(
        (r as { question_enc?: string | null }).question_enc ?? null,
      ),
    })),
  )

  const exportData = {
    exported_at: new Date().toISOString(),
    legal_notice:
      'This export is provided per GDPR Article 15. Retain at your discretion; deletion will not be remembered after this download.',
    user: profileR.data,
    quota: quotaR.data,
    subscriptions: subsR.data ?? [],
    charts: decryptedCharts,
    readings: decryptedReadings,
    reports: reportsR.data ?? [],
    support_tickets: ticketsR.data ?? [],
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="bazilens-export-${user.id.slice(0, 8)}-${Date.now()}.json"`,
    },
  })
})
