import { create } from 'zustand'
import type { Tier } from './subscriptionStore'

const READING_LIMIT_BY_TIER: Record<Tier, number> = {
  free: 3,
  plus: 30,
  pro: 200, // soft cap, see PLAN §9.3
}

type QuotaState = {
  readingsUsed: number
  pdfReportsUsed: number
  periodStart: Date | null
  loading: boolean
  set: (s: Partial<Omit<QuotaState, 'set' | 'reset' | 'remainingForTier'>>) => void
  reset: () => void
  remainingForTier: (tier: Tier) => number
}

export const useQuotaStore = create<QuotaState>((set, get) => ({
  readingsUsed: 0,
  pdfReportsUsed: 0,
  periodStart: null,
  loading: false,
  set: (next) => set(next),
  reset: () => set({ readingsUsed: 0, pdfReportsUsed: 0, periodStart: null }),
  remainingForTier: (tier) => Math.max(0, READING_LIMIT_BY_TIER[tier] - get().readingsUsed),
}))
