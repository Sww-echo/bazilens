// PDF chapter definitions. Each chapter has its own prompt_versions row so we
// can iterate independently. See docs/PLAN.md §13.2 + .trellis/spec/guides/ai-quality-eval.md.

export type ChapterId =
  | 'overview'
  | 'wuxing'
  | 'personality'
  | 'family'
  | 'dayun'
  | 'fortune'
  | 'advice'

export type ChapterDef = {
  id: ChapterId
  title: string
  maxTokens: number
  promptVersionPrefix: string // appended with `-v1` etc; resolved at runtime
}

export const FULL_BAZI_CHAPTERS: ChapterDef[] = [
  { id: 'overview',    title: '命理总论',       maxTokens: 1500, promptVersionPrefix: 'bazi-pdf-overview' },
  { id: 'wuxing',      title: '五行喜忌详解',   maxTokens: 2000, promptVersionPrefix: 'bazi-pdf-wuxing' },
  { id: 'personality', title: '性格与人生走向', maxTokens: 2000, promptVersionPrefix: 'bazi-pdf-personality' },
  { id: 'family',      title: '六亲缘分',       maxTokens: 2200, promptVersionPrefix: 'bazi-pdf-family' },
  { id: 'dayun',       title: '大运流年走势',   maxTokens: 2500, promptVersionPrefix: 'bazi-pdf-dayun' },
  { id: 'fortune',     title: '财运 健康 学业', maxTokens: 2200, promptVersionPrefix: 'bazi-pdf-fortune' },
  { id: 'advice',      title: '实用建议',       maxTokens: 1500, promptVersionPrefix: 'bazi-pdf-advice' },
]

// Sprint 2 SKUs — left here so report-generate can switch on type easily.
export const ZIWEI_FULL_CHAPTERS: ChapterDef[] = []
export const LIUNIAN_CHAPTERS: ChapterDef[] = []
export const COMPATIBILITY_CHAPTERS: ChapterDef[] = []

export function chaptersForType(reportType: string): ChapterDef[] {
  switch (reportType) {
    case 'full_bazi': return FULL_BAZI_CHAPTERS
    case 'ziwei_full': return ZIWEI_FULL_CHAPTERS
    case 'liunian': return LIUNIAN_CHAPTERS
    case 'compatibility': return COMPATIBILITY_CHAPTERS
    default: return FULL_BAZI_CHAPTERS
  }
}

// Prompt version resolver — returns the latest active version id for a given
// chapter prefix. For Sprint 1 we hard-code "-v1" suffix; later versions will
// be selected by the prompt evaluation pipeline (see ai-quality-eval.md A/B).
export function resolvePromptVersion(prefix: string): string {
  return `${prefix}-v1`
}
