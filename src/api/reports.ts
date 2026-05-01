// Reports (PDF detailed report) API — list / signed download URL / Realtime progress.
// Spec: docs/PLAN.md §13 + docs/TECH_SPEC.md §14.

import { supabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ReportStatus = 'pending' | 'paid' | 'generating' | 'ready' | 'failed' | 'refunded'

export type ReportRow = {
  id: string
  user_id: string
  chart_id: string
  type: 'full_bazi' | 'liunian' | 'compatibility' | 'ziwei_full'
  status: ReportStatus
  progress: number
  pdf_url: string | null
  pdf_size_bytes: number | null
  amount_usd: number | null
  paid_at: string | null
  ready_at: string | null
  user_rating: number | null
  user_feedback: string | null
  refund_id: string | null
  refund_amount_usd: number | null
  error_message: string | null
  created_at: string
}

const REPORTS_BUCKET = 'reports'

export async function listReports(limit = 30): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, user_id, chart_id, type, status, progress, pdf_url, pdf_size_bytes, amount_usd, paid_at, ready_at, user_rating, user_feedback, refund_id, refund_amount_usd, error_message, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as ReportRow[]
}

export async function getReport(id: string): Promise<ReportRow | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, user_id, chart_id, type, status, progress, pdf_url, pdf_size_bytes, amount_usd, paid_at, ready_at, user_rating, user_feedback, refund_id, refund_amount_usd, error_message, created_at',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as ReportRow | null) ?? null
}

/**
 * Create a signed download URL (valid for `expiresInSeconds`, default 24h).
 * Path is taken from `reports.pdf_url` (set by report-generate Edge Function).
 */
export async function getReportDownloadUrl(reportId: string, expiresInSeconds = 24 * 3600): Promise<string> {
  const report = await getReport(reportId)
  if (!report) throw new Error('report_not_found')
  if (!report.pdf_url) throw new Error('report_not_ready')

  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(report.pdf_url, expiresInSeconds)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'sign_failed')
  return data.signedUrl
}

/**
 * Subscribe to progress updates for a single report. Returns the Realtime
 * channel — caller should `.unsubscribe()` on cleanup.
 */
export function subscribeReportProgress(
  reportId: string,
  onUpdate: (row: ReportRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`report-${reportId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reports',
        filter: `id=eq.${reportId}`,
      },
      (payload) => onUpdate(payload.new as ReportRow),
    )
    .subscribe()
}

export async function rateReport(id: string, rating: 1 | 2 | 3 | 4 | 5, feedback?: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ user_rating: rating, user_feedback: feedback ?? null })
    .eq('id', id)
  if (error) throw error
}
