// Hook for own subscription state. Auto-fetches on mount + after auth changes.
// Updates Zustand store so other components (UpgradeButton, QuotaBar) see fresh data.

import { useCallback, useEffect, useState } from 'react'

import { fetchMySubscription, type SubscriptionRow } from '../api/subscriptions'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionStore } from '../stores/subscriptionStore'

export type UseSubscriptionResult = {
  row: SubscriptionRow | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSubscription(): UseSubscriptionResult {
  const user = useAuthStore((s) => s.user)
  const setStore = useSubscriptionStore((s) => s.set)
  const [row, setRow] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setRow(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMySubscription()
      setRow(data)
      if (data) {
        setStore({
          tier: data.tier,
          status: data.status,
          currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [user, setStore])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { row, loading, error, refresh }
}
