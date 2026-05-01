// Redline checks per .trellis/spec/guides/ai-quality-eval.md §"红线检测".
//
// Returns a quality score 0-100. Values < 60 are considered failed and should
// trigger a refund / regenerate flow when they happen on PDF reports.

export type RedlineResult = {
  score: number
  flags: Array<{ rule: string; sample: string; deduction: number }>
}

const BANNED_PATTERNS: Array<{ rule: string; pattern: RegExp; deduction: number }> = [
  { rule: 'folk_misconception_缺',     pattern: /命中缺[金木水火土]/g, deduction: 20 },
  { rule: 'emotional_harm_克',         pattern: /克[夫妻子]/g,          deduction: 25 },
  { rule: 'health_prediction',         pattern: /活不过\d+岁|有大灾|大祸临头/g, deduction: 30 },
  { rule: 'absolute_assertion',        pattern: /必定|一定会|百分之百|绝对会/g,  deduction: 15 },
  { rule: 'lucky_lotto_apple_redline', pattern: /幸运号码|彩票|赌博/g,  deduction: 25 },
]

const SHENSHA_LIKE_RE = /[一-龥]{2,4}(?=星|煞|神)/g

/**
 * Run redline detection. Pass an explicit allowed-shensha set if available
 * (e.g. derived from baziShenSha.ts at build time).
 */
export function runRedlineChecks(
  text: string,
  options: { allowedShensha?: Set<string> } = {},
): RedlineResult {
  let score = 100
  const flags: RedlineResult['flags'] = []

  for (const { rule, pattern, deduction } of BANNED_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text))) {
      flags.push({ rule, sample: match[0], deduction })
      score -= deduction
    }
  }

  if (options.allowedShensha) {
    const seen = new Set<string>()
    let m: RegExpExecArray | null
    SHENSHA_LIKE_RE.lastIndex = 0
    while ((m = SHENSHA_LIKE_RE.exec(text))) {
      if (seen.has(m[0])) continue
      seen.add(m[0])
      if (!options.allowedShensha.has(m[0])) {
        flags.push({ rule: 'fabricated_shensha', sample: m[0], deduction: 8 })
        score -= 8
      }
    }
  }

  return { score: Math.max(0, score), flags }
}

const DISCLAIMER_ZH =
  '\n\n---\n本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。'

const DISCLAIMER_EN =
  '\n\n---\nThis reading is based on traditional Chinese metaphysics for educational and entertainment purposes only. It does not constitute any professional advice.'

/**
 * Append disclaimer if missing. Locale-aware (en uses English version).
 */
export function withDisclaimer(text: string, locale: string): string {
  if (text.includes('本解读基于传统命理研究') || text.includes('educational and entertainment purposes')) {
    return text
  }
  return text + (locale.startsWith('en') ? DISCLAIMER_EN : DISCLAIMER_ZH)
}
