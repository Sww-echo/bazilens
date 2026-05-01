// Quota deduction wrappers around the consume_reading_quota RPC.
// See migrations/0002_quota_rpc.sql + .trellis/spec/supabase/edge-functions.md.

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Tier } from './llm.ts'

export type QuotaResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'quota_exceeded' }

export async function consumeReadingQuota(
  supabase: SupabaseClient,
  userId: string,
  tier: Tier,
): Promise<QuotaResult> {
  const { data, error } = await supabase.rpc('consume_reading_quota', {
    p_user_id: userId,
    p_tier: tier,
  })
  if (error) throw new Error(`quota_rpc_failed:${error.message}`)

  // RPC returns table → array of rows
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('quota_rpc_empty_result')

  if (row.allowed) return { ok: true, remaining: row.remaining ?? 0 }
  return { ok: false, reason: (row.reason as 'quota_exceeded') ?? 'quota_exceeded' }
}

export async function rollbackReadingQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('rollback_reading_quota', { p_user_id: userId })
  if (error) {
    // Log but don't throw — rollback is best-effort and not user-facing.
    console.error('[quota] rollback failed:', error)
  }
}
