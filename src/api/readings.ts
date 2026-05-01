// Readings API — streaming SSE wrapper for the /reading Edge Function.
// Spec: .trellis/spec/supabase/edge-functions.md "Streaming SSE".

import { supabase } from './client'
import type { StreamEvent } from '../types/api.types'

export type StartReadingInput = {
  chart_id: string
  scene: string
  question?: string
  prompt_version: string
}

/**
 * Async generator yielding SSE events from the /reading endpoint.
 * Caller should `for await` and dispatch by `ev.type`.
 *
 *   for await (const ev of streamReading({ chart_id, scene, prompt_version })) {
 *     if (ev.type === 'delta') append(ev.text)
 *     else if (ev.type === 'done') finalize(ev.reading_id)
 *     else if (ev.type === 'error') showToast(ev.message)
 *   }
 */
export async function* streamReading(input: StartReadingInput): AsyncGenerator<StreamEvent> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reading`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(input),
  })

  if (!r.ok) {
    let body: { error?: string } = {}
    try { body = await r.json() } catch { /* non-JSON */ }
    throw new Error(body.error ?? `http_${r.status}`)
  }
  if (!r.body) throw new Error('no_response_body')

  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by blank lines
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice(6).trim()
      if (!payload) continue
      try {
        yield JSON.parse(payload) as StreamEvent
      } catch {
        // ignore malformed frame
      }
    }
  }
}

// History + rating

export type ReadingRow = {
  id: string
  chart_id: string | null
  scene: string
  prompt_version: string
  response: string | null
  model: string | null
  status: 'pending' | 'streaming' | 'completed' | 'failed'
  rating: number | null
  cost_usd: number | null
  created_at: string
  completed_at: string | null
}

export async function listReadings(chartId?: string, limit = 50): Promise<ReadingRow[]> {
  let q = supabase
    .from('readings')
    .select(
      'id, chart_id, scene, prompt_version, response, model, status, rating, cost_usd, created_at, completed_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (chartId) q = q.eq('chart_id', chartId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as ReadingRow[]
}

export async function rateReading(id: string, rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
  const { error } = await supabase
    .from('readings')
    .update({ rating, rated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
