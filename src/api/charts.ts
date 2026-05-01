// Charts API. Server-encrypted PII flows through /chart-create Edge Function;
// reads come straight from the row (encrypted fields stay opaque).
// Spec: .trellis/spec/guides/privacy-pii.md

import { supabase } from './client'
import type { Database } from '../types/database.types'

type ChartRow = Database['public']['Tables'] extends { charts: { Row: infer R } } ? R : {
  id: string
  user_id: string
  type: string
  title: string
  input_data: Record<string, unknown>
  chart_data: unknown
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type ChartType = 'bazi' | 'ziwei' | 'liuyao' | 'meihua' | 'qimen' | 'liuren' | 'tarot' | 'ssgw'

export type CreateChartInput = {
  type: ChartType
  title: string
  /** Plaintext — encrypted server-side, never persisted in jsonb. */
  birth_time?: string
  /** Plaintext — encrypted server-side, never persisted in jsonb. */
  birth_place?: string
  /** Solar/lunar/timezone/gender/calendar — non-PII metadata. */
  input_meta: Record<string, unknown>
  /** Engine output (jsonb). Computed on the frontend. */
  chart_data: unknown
}

export async function createChart(input: CreateChartInput): Promise<{ id: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chart-create`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error ?? `http_${r.status}`)
  }
  const { chart } = (await r.json()) as { chart: { id: string } }
  return { id: chart.id }
}

export async function listCharts(opts?: { type?: ChartType; limit?: number }): Promise<ChartRow[]> {
  let q = supabase
    .from('charts')
    .select('id, user_id, type, title, input_data, chart_data, is_favorite, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50)
  if (opts?.type) q = q.eq('type', opts.type)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as ChartRow[]
}

export async function getChart(id: string): Promise<ChartRow | null> {
  const { data, error } = await supabase
    .from('charts')
    .select('id, user_id, type, title, input_data, chart_data, is_favorite, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as ChartRow) ?? null
}

export async function toggleFavoriteChart(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('charts')
    .update({ is_favorite: favorite })
    .eq('id', id)
  if (error) throw error
}

export async function deleteChart(id: string): Promise<void> {
  const { error } = await supabase.from('charts').delete().eq('id', id)
  if (error) throw error
}
