// Hook for streaming AI readings. Wraps src/api/readings.ts streamReading().
//
// Usage:
//   const { text, status, error, run, reset } = useReading()
//   <button onClick={() => run({ chart_id, scene, prompt_version })}>Start</button>

import { useCallback, useRef, useState } from 'react'
import { streamReading, type StartReadingInput } from '../api/readings'

export type ReadingStatus = 'idle' | 'streaming' | 'done' | 'error'

export type UseReadingResult = {
  text: string
  status: ReadingStatus
  error: string | null
  readingId: string | null
  fellBack: boolean
  qualityScore: number | null
  run: (input: StartReadingInput) => Promise<void>
  reset: () => void
  abort: () => void
}

export function useReading(): UseReadingResult {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<ReadingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [fellBack, setFellBack] = useState(false)
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const abortRef = useRef(false)

  const reset = useCallback(() => {
    abortRef.current = false
    setText('')
    setStatus('idle')
    setError(null)
    setReadingId(null)
    setFellBack(false)
    setQualityScore(null)
  }, [])

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  const run = useCallback(async (input: StartReadingInput) => {
    abortRef.current = false
    setText('')
    setStatus('streaming')
    setError(null)
    setReadingId(null)
    setFellBack(false)
    setQualityScore(null)

    try {
      for await (const ev of streamReading(input)) {
        if (abortRef.current) return
        switch (ev.type) {
          case 'delta':
            setText((prev) => prev + ev.text)
            break
          case 'done':
            setReadingId(ev.reading_id)
            // 'done' may carry extra fields injected by reading/index.ts
            const extra = ev as typeof ev & { fell_back?: boolean; quality_score?: number }
            setFellBack(Boolean(extra.fell_back))
            setQualityScore(typeof extra.quality_score === 'number' ? extra.quality_score : null)
            setStatus('done')
            break
          case 'error':
            setError(ev.message)
            setStatus('error')
            break
        }
      }
      // Stream ended without 'done' frame → treat as error
      if (status === 'streaming' && !abortRef.current) {
        setStatus('done')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
    }
  }, [status])

  return { text, status, error, readingId, fellBack, qualityScore, run, reset, abort }
}
