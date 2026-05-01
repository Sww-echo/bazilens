// supabase/functions/chart-create/index.ts
// Server-side chart creation. Encrypts birth_time / birth_place with the
// service-only PII key before persisting, so plaintext never touches the
// frontend bundle or browser local state.
//
// Why an Edge Function and not direct supabase.from('charts').insert():
//   - PII_ENCRYPTION_KEY MUST stay server-side (.trellis/spec/guides/privacy-pii.md).
//   - The chart engine (bazi/ziwei) runs on the frontend (cheap CPU), but the
//     PII fields it consumes need to be re-encrypted before persistence.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { json, preflight, requireAuth, serviceClient } from '../_shared/cors.ts'
import { encryptPIIOrNull } from '../_shared/crypto.ts'

type ChartType = 'bazi' | 'ziwei' | 'liuyao' | 'meihua' | 'qimen' | 'liuren' | 'tarot' | 'ssgw'

type CreateChartRequest = {
  type: ChartType
  title: string
  // Plaintext PII — encrypted before storage, never echoed back.
  birth_time?: string
  birth_place?: string
  // Non-PII metadata (calendar info, gender). Stored as-is.
  input_meta: Record<string, unknown>
  // Engine output. Computed on frontend; trusted but capped in size.
  chart_data: unknown
}

const CHART_TYPES: ChartType[] = [
  'bazi', 'ziwei', 'liuyao', 'meihua', 'qimen', 'liuren', 'tarot', 'ssgw',
]

const MAX_CHART_DATA_BYTES = 200 * 1024 // 200 KB ceiling — engines should fit easily

serve(async (req: Request) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authResult = await requireAuth(req)
  if ('response' in authResult) return authResult.response
  const { user } = authResult

  let body: CreateChartRequest
  try {
    body = (await req.json()) as CreateChartRequest
  } catch {
    return json({ error: 'invalid_json' }, 422)
  }

  // Validation
  if (!CHART_TYPES.includes(body.type)) {
    return json({ error: 'invalid_chart_type' }, 422)
  }
  if (!body.title || body.title.length > 80) {
    return json({ error: 'invalid_title' }, 422)
  }
  if (typeof body.input_meta !== 'object' || body.input_meta === null) {
    return json({ error: 'invalid_input_meta' }, 422)
  }
  const chartDataSize = JSON.stringify(body.chart_data).length
  if (chartDataSize > MAX_CHART_DATA_BYTES) {
    return json({ error: 'chart_data_too_large', size: chartDataSize }, 413)
  }

  // Sprint 1 only ships bazi + ziwei. Reject divination types early.
  if (body.type !== 'bazi' && body.type !== 'ziwei') {
    return json({ error: 'chart_type_not_yet_available_in_sprint_1' }, 422)
  }

  const supabase = serviceClient()

  // Encrypt PII server-side
  const birthTimeEnc = await encryptPIIOrNull(body.birth_time ?? null)
  const birthPlaceEnc = await encryptPIIOrNull(body.birth_place ?? null)

  // Build input_data jsonb. NEVER store plaintext PII keys.
  const inputData: Record<string, unknown> = {
    ...sanitizeInputMeta(body.input_meta),
    ...(birthTimeEnc ? { birth_time_enc: birthTimeEnc } : {}),
    ...(birthPlaceEnc ? { birth_place_enc: birthPlaceEnc } : {}),
  }

  const { data, error } = await supabase
    .from('charts')
    .insert({
      user_id: user.id,
      type: body.type,
      title: body.title,
      input_data: inputData,
      chart_data: body.chart_data,
    })
    .select('id, type, title, created_at')
    .single()

  if (error || !data) {
    return json({ error: 'insert_failed', details: error?.message }, 500)
  }

  return json({ ok: true, chart: data })
})

/**
 * Strip any keys that look like plaintext PII even if the frontend regresses.
 * Defence-in-depth: encryption already happens above; this is a belt-and-braces
 * filter for the input_meta blob.
 */
function sanitizeInputMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const banned = new Set([
    'birth_time', 'birth_place', 'birthTime', 'birthPlace',
    'full_name', 'fullName', 'phone', 'email',
    'birth_time_enc', 'birth_place_enc', // re-set by us, not from client
  ])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (banned.has(k)) continue
    out[k] = v
  }
  return out
}
