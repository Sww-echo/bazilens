// PII pattern detection. Used to gate calls to DeepSeek (Free tier) so user
// questions containing identifiers never leave the GDPR-compliant boundary.
// See ../../../.trellis/spec/guides/privacy-pii.md "Three Hard Rules" rule 1.
//
// This is best-effort regex, not foolproof. False negatives are acceptable
// because the consequences are bounded (the chart_data going to DeepSeek
// already has no PII). False positives nudge users toward Plus, which is OK.

export type PIIMatch = { type: string; sample: string }
export type PIIDetection = { hasPII: boolean; matches: PIIMatch[] }

const PATTERNS: Array<[RegExp, string]> = [
  // Chinese names with honorifics
  [/[一-龥]{2,4}(?:先生|女士|老师|总|经理|教授|医生|博士)/g, 'name_with_title'],
  // Email
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'email'],
  // CN mobile
  [/(?<![\d])1[3-9]\d{9}(?![\d])/g, 'cn_phone'],
  // North-American phone (xxx) xxx-xxxx
  [/(?<![\d])\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?![\d])/g, 'na_phone'],
  // CN ID card
  [/(?<![\dA-Za-z])\d{17}[\dXx](?![\dA-Za-z])/g, 'cn_id_card'],
  // US SSN
  [/(?<![\d])\d{3}-\d{2}-\d{4}(?![\d])/g, 'us_ssn'],
  // Chinese company suffixes
  [/[一-龥\w]{2,12}(?:公司|集团|有限|株式会社)/g, 'company_cn'],
  // English company suffixes
  [/\b\w{2,40}\s+(?:Inc|LLC|Ltd|Corp|Corporation|GmbH|S\.A\.|Pte\.?\s*Ltd)\b/gi, 'company_en'],
  // Living-location patterns
  [/(?:位于|住在|来自|live(?:s|d)?\s+in|from)\s+[一-龥\w\s]{2,40}/gi, 'location'],
]

export function detectPII(text: string | null | undefined): PIIDetection {
  if (!text) return { hasPII: false, matches: [] }
  const matches: PIIMatch[] = []
  for (const [re, type] of PATTERNS) {
    const found = text.match(re)
    if (!found) continue
    for (const raw of found) {
      const sample = raw.length > 24 ? `${raw.slice(0, 21)}...` : raw
      matches.push({ type, sample })
    }
  }
  return { hasPII: matches.length > 0, matches }
}

/**
 * Throw a 400 if PII is present and the target tier sends data outside our
 * compliant boundary (currently Free → DeepSeek).
 *
 * Returned error shape matches src/types/api.types.ts → PIIDetectionResult.
 */
export function assertNoPIIForFreeTier(text: string, tier: 'free' | 'plus' | 'pro'): void {
  if (tier !== 'free') return
  const detection = detectPII(text)
  if (detection.hasPII) {
    const err = new Error('pii_detected')
    ;(err as Error & { detection: PIIDetection }).detection = detection
    throw err
  }
}
