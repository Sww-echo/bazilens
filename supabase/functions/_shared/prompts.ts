// Prompt template loading + rendering. Templates live in prompt_versions table
// (see migrations/0001_init.sql + seed.sql).
//
// Variables use {{path.to.field}} syntax against a shallow context object.

import { serviceClient } from './cors.ts'

export type PromptContext = Record<string, unknown>

const TEMPLATE_CACHE = new Map<string, { template: string; loadedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function loadPromptTemplate(versionId: string): Promise<string> {
  const cached = TEMPLATE_CACHE.get(versionId)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.template
  }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('template, active')
    .eq('id', versionId)
    .single()

  if (error || !data) throw new Error(`prompt_version_not_found:${versionId}`)
  if (!data.active) throw new Error(`prompt_version_inactive:${versionId}`)

  TEMPLATE_CACHE.set(versionId, { template: data.template, loadedAt: Date.now() })
  return data.template
}

export function renderTemplate(template: string, ctx: PromptContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, ctx)
    if (value === undefined || value === null) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  })
}

/**
 * Build the cache prefix used by Anthropic prompt caching when generating PDFs.
 * Same prefix across all chapter calls → cache write once, cache read 6× at 90% off.
 */
export function buildChartCachePrefix(opts: {
  chartType: string
  chartData: unknown
  inputData?: unknown
}): string {
  return [
    `命盘类型：${opts.chartType}`,
    `命盘数据：\n${JSON.stringify(opts.chartData, null, 2)}`,
    opts.inputData ? `命主信息：${JSON.stringify(opts.inputData)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const SYSTEM_PROMPT_FORTUNE_SCHOLAR = [
  '你是一位精通中国传统命理学（八字、紫微）的研究学者。',
  '请基于用户提供的命盘数据，生成专业、严谨、不宿命论的解读。',
  '语气专业但不晦涩。避免使用「克夫」「克妻」「克子」「命中缺X」「必定」「一定会」「活不过XX岁」等情感伤害或绝对断言词。',
  '不预测疾病、死亡、官非等敏感事项。任何健康提示都加「仅供文化参考，请咨询专业人士」。',
  '末尾必加：「本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。」',
].join('\n')
