// Hook for live PDF report progress + automatic signed-URL fetch when ready.
// Spec: docs/TECH_SPEC.md §14.6, .trellis/spec/frontend/state-management.md.

import { useEffect, useState } from 'react'
import {
  getReport,
  getReportDownloadUrl,
  subscribeReportProgress,
  type ReportRow,
  type ReportStatus,
} from '../api/reports'

export type UseReportProgressResult = {
  report: ReportRow | null
  status: ReportStatus | 'loading'
  progress: number
  downloadUrl: string | null
  error: string | null
}

export function useReportProgress(reportId: string | null): UseReportProgressResult {
  const [report, setReport] = useState<ReportRow | null>(null)
  const [status, setStatus] = useState<ReportStatus | 'loading'>('loading')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initial fetch + Realtime subscribe
  useEffect(() => {
    if (!reportId) return
    let unsub: (() => void) | null = null
    let cancelled = false

    void (async () => {
      try {
        const initial = await getReport(reportId)
        if (cancelled) return
        if (initial) {
          setReport(initial)
          setStatus(initial.status)
          setProgress(initial.progress)
          if (initial.status === 'ready' && !downloadUrl) {
            void fetchDownloadUrl(initial.id, setDownloadUrl, setError)
          }
        } else {
          setError('report_not_found')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    })()

    const channel = subscribeReportProgress(reportId, (row) => {
      setReport(row)
      setStatus(row.status)
      setProgress(row.progress)
      if (row.status === 'ready') {
        void fetchDownloadUrl(row.id, setDownloadUrl, setError)
      }
      if (row.status === 'failed' || row.status === 'refunded') {
        setError(row.error_message ?? row.status)
      }
    })
    unsub = () => {
      void channel.unsubscribe()
    }

    return () => {
      cancelled = true
      if (unsub) unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  return { report, status, progress, downloadUrl, error }
}

async function fetchDownloadUrl(
  reportId: string,
  setUrl: (url: string) => void,
  setError: (msg: string) => void,
): Promise<void> {
  try {
    const url = await getReportDownloadUrl(reportId)
    setUrl(url)
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}
