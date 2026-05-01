// supabase/functions/scheduled-purge/index.ts
// Cron-triggered hard delete of accounts that hit their 30-day grace expiry.
// Run daily via Supabase cron / GitHub Actions / external scheduler.
//
// Auth: requires Bearer ${CRON_SECRET}. NOT a user-facing endpoint.
//
// Spec: docs/PLAN.md §15.7 + docs/TECH_SPEC.md §16.5.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { json, serviceClient } from '../_shared/cors.ts'

const BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET_REPORTS') ?? 'reports'

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return json({ error: 'forbidden' }, 403)
  }

  const supabase = serviceClient()
  const now = new Date().toISOString()

  const { data: toDelete, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('status', 'pending_deletion')
    .lte('scheduled_delete_at', now)

  if (error) {
    return json({ error: 'query_failed', details: error.message }, 500)
  }

  let purged = 0
  let failed = 0
  for (const profile of toDelete ?? []) {
    try {
      // 1. Anonymize financial records (kept 7 years for tax compliance)
      await supabase
        .from('subscriptions')
        .update({ user_id: null, raw: null })
        .eq('user_id', profile.id)

      await supabase
        .from('reports')
        .update({ user_id: null, sections: null, pdf_url: null })
        .eq('user_id', profile.id)

      // 2. Delete PDF files from Storage
      const { data: pdfs } = await supabase.storage.from(BUCKET).list(profile.id)
      if (pdfs?.length) {
        await supabase.storage
          .from(BUCKET)
          .remove(pdfs.map((p) => `${profile.id}/${p.name}`))
      }

      // 3. CASCADE delete profile (drops charts / readings / tickets via FK)
      const { error: deleteErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)
      if (deleteErr) throw deleteErr

      // 4. Drop auth.users row
      const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(profile.id)
      if (authDeleteErr) throw authDeleteErr

      purged++
      console.log(`[scheduled-purge] deleted user ${profile.id}`)
    } catch (e) {
      failed++
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[scheduled-purge] failed for ${profile.id}:`, msg)
      // Log to incidents so admins notice
      await supabase.from('incidents').insert({
        type: 'near_miss',
        severity: 'medium',
        detected_at: now,
        description: `scheduled_purge failed for user ${profile.id}: ${msg.slice(0, 300)}`,
      })
    }
  }

  return json({ ok: true, considered: toDelete?.length ?? 0, purged, failed })
})
