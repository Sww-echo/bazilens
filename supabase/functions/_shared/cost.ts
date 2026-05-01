// Provider cost computation. Pricing table per docs/PLAN.md §9.1 (Q1-2026).
//
// Update this file when provider prices change. All Edge Functions go through
// computeCost() so cost reporting stays consistent.

export type CostInputs = {
  provider: 'claude' | 'openai' | 'deepseek'
  tokensInput: number
  tokensOutput: number
  cacheReadTokens?: number    // Anthropic prompt cache reads
  cacheWriteTokens?: number   // Anthropic prompt cache writes
}

// USD per million tokens
const PRICING = {
  claude: {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.30,
    cacheWrite: 3.75,
  },
  openai: {
    input: 2.0,         // GPT-4.1
    output: 8.0,
  },
  deepseek: {
    input: 0.27,        // DeepSeek V3
    output: 1.10,
  },
} as const

export function computeCost(c: CostInputs): number {
  if (c.provider === 'claude') {
    const cacheRead = c.cacheReadTokens ?? 0
    const cacheWrite = c.cacheWriteTokens ?? 0
    const regularInput = Math.max(0, c.tokensInput - cacheRead - cacheWrite)
    return (
      (regularInput * PRICING.claude.input +
        cacheWrite * PRICING.claude.cacheWrite +
        cacheRead * PRICING.claude.cacheRead +
        c.tokensOutput * PRICING.claude.output) /
      1_000_000
    )
  }
  if (c.provider === 'openai') {
    return (
      (c.tokensInput * PRICING.openai.input + c.tokensOutput * PRICING.openai.output) /
      1_000_000
    )
  }
  return (
    (c.tokensInput * PRICING.deepseek.input + c.tokensOutput * PRICING.deepseek.output) /
    1_000_000
  )
}

// Rough monthly cost projection helper for ops dashboards.
export function projectMonthlyCost(perRequest: number, requestsPerDay: number): number {
  return perRequest * requestsPerDay * 30
}
