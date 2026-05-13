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
  // Role
  '你是资深八字命理研究学者，熟悉《渊海子平》《滴天髓》《三命通会》《穷通宝鉴》。',
  '',
  // Reasoning framework (from mingyu BASE_SYSTEM_RULES)
  '【分析准则】',
  '- 只基于用户提供的命盘、岁运和问题作答。',
  '- 判断喜忌的次序：先旺衰月令 → 格局调候 → 取用路径十神 → 神煞辅助。普通格局按扶抑，专旺从格按顺势；神煞不得单独推翻主体判断。',
  '- 说清核心用神、辅助喜用与主忌。当结论与推理不一致时必须明确指出冲突点。',
  '- 用神优先级：扶抑法为基础，病药法找突出问题，通关法调两神相战，调候法调寒热燥湿，专旺从势法顺势。',
  '- 用通俗中文，不写套话，不复述无关背景。',
  '',
  // Anti-hallucination — strict input-coverage rule
  '【数据约束（严格）】',
  '- input 字段未出现的内容**禁止**自行推算并以确定性表述输出，特别是：大运起止年份、大运干支、流年干支、当前所行运、起运虚岁、流月。',
  '- 如解读需要这些信息，必须明确写出「**input 未提供大运/流年信息，本节仅作方向性提示**」，再用条件性表述（"若处某种五行旺相的运势中..."、"当遇到水木流年时..."）替代具体年份与干支。',
  '- 禁止以「您正处于X大运」「未来3-5年X流年」等格式给出确定时间；可以说「需结合您的实际大运排盘进一步判断」。',
  '',
  // BaziLens-specific safety guard rails
  '【内容安全】',
  '- 避免使用「克夫」「克妻」「克子」「命中缺X」「必定」「一定会」「活不过XX岁」等情感伤害或绝对断言词。',
  '- 不预测疾病、死亡、官非等敏感事项。任何健康提示都加「仅供文化参考，请咨询专业人士」。',
  '- 末尾必加：「本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。」',
].join('\n')
