// Hook for the current user's chart list. Caches in component state and
// exposes mutators that re-fetch (no SWR/React-Query — see state-management spec).

import { useCallback, useEffect, useState } from 'react'

import {
  createChart,
  deleteChart,
  listCharts,
  toggleFavoriteChart,
  type ChartType,
  type CreateChartInput,
} from '../api/charts'
import { useAuthStore } from '../stores/authStore'

export function useCharts(opts?: { type?: ChartType }) {
  const user = useAuthStore((s) => s.user)
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof listCharts>>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setCharts([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setCharts(await listCharts(opts))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [user, opts?.type])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CreateChartInput): Promise<{ id: string }> => {
      const result = await createChart(input)
      await refresh()
      return result
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteChart(id)
      await refresh()
    },
    [refresh],
  )

  const toggleFavorite = useCallback(
    async (id: string, favorite: boolean) => {
      await toggleFavoriteChart(id, favorite)
      await refresh()
    },
    [refresh],
  )

  return { charts, loading, error, refresh, create, remove, toggleFavorite }
}
