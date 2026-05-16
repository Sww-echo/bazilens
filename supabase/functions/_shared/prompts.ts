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
 *
 * For BaZi charts, flattens chart_data.bazi.luckInfo into a readable section so
 * the LLM doesn't have to parse deep nested JSON to find dayun + liunian.
 */
export function buildChartCachePrefix(opts: {
  chartType: string
  chartData: unknown
  inputData?: unknown
}): string {
  const baziSummary = extractBaziSummary(opts.chartData)
  return [
    `命盘类型：${opts.chartType}`,
    baziSummary ? `命盘要点：\n${baziSummary}` : '',
    `命盘数据（原始 JSON）：\n${JSON.stringify(opts.chartData, null, 2)}`,
    opts.inputData ? `命主信息：${JSON.stringify(opts.inputData)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function extractBaziSummary(chartData: unknown): string | null {
  if (!chartData || typeof chartData !== 'object') return null
  const cd = chartData as { kind?: string; bazi?: BaziLike }
  const bazi = cd.bazi
  if (!bazi || typeof bazi !== 'object') return null

  const parts: string[] = []

  // Four pillars + dayMaster + zodiac
  if (bazi.pillars) {
    const p = bazi.pillars
    parts.push(
      `四柱：年柱 ${p.year?.ganZhi ?? '?'}，月柱 ${p.month?.ganZhi ?? '?'}，日柱 ${p.day?.ganZhi ?? '?'}，时柱 ${p.hour?.ganZhi ?? '?'}`,
    )
  }
  if (bazi.dayMaster) {
    const d = bazi.dayMaster
    parts.push(`日主：${d.gan}（${d.yinYang}${d.element}）`)
  }
  if (bazi.wuxingStrength?.percentages) {
    const w = bazi.wuxingStrength.percentages
    const items = ['金', '木', '水', '火', '土']
      .map((el) => `${el}${typeof w[el] === 'number' ? Math.round(w[el] as number) : '?'}%`)
      .join('、')
    parts.push(`五行力量：${items}`)
  }

  // Dayun cycles (flattened so the LLM doesn't have to dig into JSON)
  if (Array.isArray(bazi.luckInfo?.cycles)) {
    const cycles = bazi.luckInfo.cycles
    const formatted = cycles
      .filter((c) => c && (c.ganZhi || c.year !== undefined))
      .map((c) => {
        const start = c.startSolarTime?.year ?? c.year
        const end = c.endSolarTime?.year
        const range = end ? `${start}-${end}` : `${start}起`
        const age = typeof c.age === 'number' ? `${c.age}岁起` : ''
        const tag = c.isXiaoyun ? '（小运）' : ''
        return `  ${c.ganZhi ?? '?'}${tag} ${range}${age ? ' / ' + age : ''}`
      })
      .join('\n')
    if (formatted) parts.push(`大运（共 ${cycles.length} 步）：\n${formatted}`)
  }

  // Top-level liunian (current year)
  if (Array.isArray(bazi.liunian) && bazi.liunian.length > 0) {
    const items = bazi.liunian
      .slice(0, 12)
      .map((y) => `  ${y.year}年 ${y.ganZhi ?? '?'}（${y.tenGod ?? ''}/${y.tenGodZhi ?? ''}）`)
      .join('\n')
    if (items) parts.push(`流年（最近 ${Math.min(12, bazi.liunian.length)} 年）：\n${items}`)
  }

  // Nayin / mingGong if present
  if (bazi.mingGong) parts.push(`命宫：${bazi.mingGong}`)
  if (bazi.taiYuan) parts.push(`胎元：${bazi.taiYuan}`)

  return parts.length > 0 ? parts.join('\n') : null
}

type BaziLike = {
  pillars?: {
    year?: { gan?: string; zhi?: string; ganZhi?: string }
    month?: { gan?: string; zhi?: string; ganZhi?: string }
    day?: { gan?: string; zhi?: string; ganZhi?: string }
    hour?: { gan?: string; zhi?: string; ganZhi?: string }
  }
  dayMaster?: { gan?: string; element?: string; yinYang?: string }
  wuxingStrength?: { percentages?: Record<string, unknown> }
  luckInfo?: {
    cycles?: Array<{
      age?: number
      year?: number
      ganZhi?: string
      isXiaoyun?: boolean
      startSolarTime?: { year?: number }
      endSolarTime?: { year?: number }
    }>
  }
  liunian?: Array<{
    year?: number
    ganZhi?: string
    tenGod?: string
    tenGodZhi?: string
  }>
  mingGong?: string
  taiYuan?: string
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
  '- 只引用 input "命盘要点" 与 "命盘数据" 中实际出现的字段；不得编造未出现的内容。',
  '- 大运/流年的引用：',
  '  · 如 input 的"命盘要点"提供了**大运（共 N 步）**或**流年**清单，请直接引用其中的干支与起止年份，给出具体应期分析。',
  '  · 如清单**未提供**，必须写「**input 未提供大运/流年信息，本节仅作方向性提示**」，再用条件表述（"若处某种五行旺相的运势中..."）代替具体年份。**严禁**自行推算干支或起止年份。',
  '- 神煞/胎元/命宫同理：input 给则用，未给则不臆造。',
  '',
  // BaziLens-specific safety guard rails
  '【内容安全】',
  '- 避免使用「克夫」「克妻」「克子」「命中缺X」「必定」「一定会」「活不过XX岁」等情感伤害或绝对断言词。',
  '- 不预测疾病、死亡、官非等敏感事项。任何健康提示都加「仅供文化参考，请咨询专业人士」。',
  '- 末尾必加：「本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。」',
].join('\n')
