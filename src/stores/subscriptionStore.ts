import { create } from 'zustand'

export type Tier = 'free' | 'plus' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired'

type SubscriptionState = {
  tier: Tier
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  loading: boolean
  set: (s: Partial<Omit<SubscriptionState, 'set' | 'reset' | 'loading'>>) => void
  reset: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  tier: 'free',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  loading: false,
  set: (next) => set(next),
  reset: () =>
    set({ tier: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false }),
}))
