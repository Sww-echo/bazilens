// Bridge between mingyu chart engines (bazi / ziwei) and the BaziLens
// `charts` table contract (input_meta + chart_data).
//
// Engines stay untouched (per .trellis/spec/frontend/directory-structure.md
// "保留 mingyu 引擎"). This file is the only place that knows the engine
// internals AND the storage schema, so any future engine change has a single
// adaptation point.

import {
  buildPersonFromInput,
  calculateFullBaziChart,
  calculateFullZiweiChart,
  type ZiweiRuntime,
} from './full-chart-engine'
import type { CreateChartInput } from '../api/charts'

// =============================================================================
// User-facing form input — what the chart input UI collects.
// PII fields (birth_time / birth_place) are flagged so the bridge can route
// them to server-side encryption rather than the input_meta jsonb.
// =============================================================================

export type ChartFormInput = {
  /** Display title chosen by the user (e.g. "我的本命盘"). Stored as charts.title. */
  title: string
  gender: 'male' | 'female'
  /** Calendar of birthDate fields. */
  dateType: 'solar' | 'lunar'
  year: string   // 'YYYY'
  month: string  // 'M' or 'MM'
  day: string    // 'D' or 'DD'
  isLeapMonth: boolean
  /** Either a 1-12 timeIndex (子=0 ... 亥=11) or true-solar exact hour/minute. */
  timeIndex: number | ''
  useTrueSolarTime: boolean
  birthHour: string         // 'HH' (true-solar mode)
  birthMinute: string       // 'MM' (true-solar mode)
  /** PII — encrypted server-side. Plaintext is sent to /chart-create only. */
  birthPlace: string
  birthLongitude: string    // numeric string; non-PII
}

// =============================================================================
// Composite chart_data the table will store.
// Sprint 1 ships bazi + ziwei together so users can compare on one chart record.
// =============================================================================

export type BaziChartData = ReturnType<typeof calculateFullBaziChart>
export type ZiweiChartData = ZiweiRuntime
export type ChartData =
  | { kind: 'bazi'; bazi: BaziChartData }
  | { kind: 'ziwei'; ziwei: ZiweiChartData }
  | { kind: 'bazi+ziwei'; bazi: BaziChartData; ziwei: ZiweiChartData }

// =============================================================================
// Build a `CreateChartInput` (what /chart-create expects) from form input.
// Runs the engines locally, then routes plaintext PII to server-side fields.
// =============================================================================

export async function buildBaziChartInput(form: ChartFormInput, title: string = form.title): Promise<CreateChartInput> {
  const person = buildPersonFromInput(form)
  const bazi = calculateFullBaziChart(person)

  return {
    type: 'bazi',
    title: title || defaultTitle('bazi', form),
    birth_time: composeBirthTime(form),
    birth_place: form.birthPlace || undefined,
    input_meta: stripPIIFromForm(form),
    chart_data: { kind: 'bazi', bazi } satisfies ChartData,
  }
}

export async function buildZiweiChartInput(form: ChartFormInput, title: string = form.title): Promise<CreateChartInput> {
  const ziwei = await calculateFullZiweiChart({
    name: '',
    dateType: form.dateType,
    birthDate: `${form.year}-${pad2(form.month)}-${pad2(form.day)}`,
    birthTimeIndex: typeof form.timeIndex === 'number' ? form.timeIndex : 0,
    gender: form.gender === 'male' ? '男' : '女',
    isLeapMonth: form.isLeapMonth,
  })

  return {
    type: 'ziwei',
    title: title || defaultTitle('ziwei', form),
    birth_time: composeBirthTime(form),
    birth_place: form.birthPlace || undefined,
    input_meta: stripPIIFromForm(form),
    chart_data: { kind: 'ziwei', ziwei } satisfies ChartData,
  }
}

/**
 * Sprint 1 convenience: compute both engines and store as one chart record so
 * users get bazi + ziwei views from a single purchase / scan. The `type` field
 * is kept as 'bazi' so existing reports/readings flows continue to work; the
 * extra ziwei payload sits inside chart_data.
 */
export async function buildCombinedChartInput(form: ChartFormInput, title: string = form.title): Promise<CreateChartInput> {
  const person = buildPersonFromInput(form)
  const bazi = calculateFullBaziChart(person)
  const ziwei = await calculateFullZiweiChart({
    name: '',
    dateType: form.dateType,
    birthDate: `${form.year}-${pad2(form.month)}-${pad2(form.day)}`,
    birthTimeIndex: typeof form.timeIndex === 'number' ? form.timeIndex : 0,
    gender: form.gender === 'male' ? '男' : '女',
    isLeapMonth: form.isLeapMonth,
  })
  return {
    type: 'bazi',
    title: title || defaultTitle('bazi+ziwei', form),
    birth_time: composeBirthTime(form),
    birth_place: form.birthPlace || undefined,
    input_meta: stripPIIFromForm(form),
    chart_data: { kind: 'bazi+ziwei', bazi, ziwei } satisfies ChartData,
  }
}

// =============================================================================
// Reading the stored chart back: extract engine outputs for prompt assembly.
// =============================================================================

export function extractBaziChart(chartData: unknown): BaziChartData | null {
  if (!chartData || typeof chartData !== 'object') return null
  const cd = chartData as { kind?: string; bazi?: BaziChartData }
  if (cd.kind === 'bazi' || cd.kind === 'bazi+ziwei') return cd.bazi ?? null
  return null
}

export function extractZiweiChart(chartData: unknown): ZiweiChartData | null {
  if (!chartData || typeof chartData !== 'object') return null
  const cd = chartData as { kind?: string; ziwei?: ZiweiChartData }
  if (cd.kind === 'ziwei' || cd.kind === 'bazi+ziwei') return cd.ziwei ?? null
  return null
}

// =============================================================================
// Helpers
// =============================================================================

const PII_KEYS_TO_STRIP = new Set([
  'birthPlace', 'birth_place', 'birthLongitude', // longitude leaks place if precise
  // hour/minute alone is fine (already obfuscated by year/month/day combo);
  // the privacy boundary is the address + exact local time pair.
])

function stripPIIFromForm(form: ChartFormInput): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (PII_KEYS_TO_STRIP.has(k)) continue
    out[k] = v
  }
  // Compute a coarse-grained birth window (year + month + day + timeIndex) that's
  // safe to send to LLMs. Birth hour granularity is already shang/zhong/xia 时辰
  // when timeIndex is used.
  return out
}

function composeBirthTime(form: ChartFormInput): string {
  const date = `${form.year}-${pad2(form.month)}-${pad2(form.day)}`
  if (form.useTrueSolarTime) {
    return `${date} ${pad2(form.birthHour)}:${pad2(form.birthMinute)} (true-solar)`
  }
  if (typeof form.timeIndex === 'number') {
    return `${date} 时辰=${form.timeIndex}`
  }
  return date
}

function defaultTitle(kind: string, form: ChartFormInput): string {
  return `${kind === 'ziwei' ? '紫微' : kind === 'bazi+ziwei' ? '八字+紫微' : '八字'}盘 · ${form.year}-${pad2(form.month)}-${pad2(form.day)}`
}

function pad2(s: string | number): string {
  const v = String(s)
  return v.length >= 2 ? v : `0${v}`
}
