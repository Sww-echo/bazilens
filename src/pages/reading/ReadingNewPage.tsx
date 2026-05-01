import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'

import { PageContainer, PageHeader } from '@/components/PageHeader'
import { Disclaimer } from '@/components/Disclaimer'
import { useReading } from '@/hooks/useReading'
import { rateReading } from '@/api/readings'

const SCENES = [
  { id: 'marriage', label: '婚姻情感' },
  { id: 'career', label: '事业方向' },
  { id: 'wealth', label: '财运结构' },
  { id: 'health', label: '健康提示' },
  { id: 'study', label: '学业规划' },
] as const

const PROMPT_VERSION_BY_SCENE: Record<string, string> = {
  marriage: 'bazi-marriage-v1',
  career: 'bazi-career-v1',
  wealth: 'bazi-wealth-v1',
  health: 'bazi-health-v1',
  study: 'bazi-study-v1',
}

export default function ReadingNewPage() {
  const [params] = useSearchParams()
  const chartId = params.get('chart_id') ?? ''
  const [scene, setScene] = useState<typeof SCENES[number]['id']>('marriage')
  const [question, setQuestion] = useState('')
  const [rated, setRated] = useState(false)
  const { text, status, error, readingId, fellBack, qualityScore, run, reset } = useReading()

  async function handleRun() {
    if (!chartId) return
    setRated(false)
    await run({
      chart_id: chartId,
      scene,
      question: question.trim() || undefined,
      prompt_version: PROMPT_VERSION_BY_SCENE[scene] ?? 'bazi-marriage-v1',
    })
  }

  async function handleRate(stars: 1 | 2 | 3 | 4 | 5) {
    if (!readingId) return
    await rateReading(readingId, stars)
    setRated(true)
  }

  return (
    <>
      <PageHeader title="AI 解读" subtitle="选择场景、输入具体问题，开始流式解读" />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar — controls */}
          <div className="space-y-4 lg:col-span-1">
            <div className="card">
              <div className="text-xs font-medium uppercase tracking-wider text-[--color-mist-400]">场景</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SCENES.map((s) => (
                  <button
                    key={s.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      scene === s.id
                        ? 'border-[--color-ink] bg-[--color-mist-50] text-[--color-ink]'
                        : 'border-[--color-ink]/15 text-[--color-mist-500]'
                    }`}
                    onClick={() => setScene(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="text-xs font-medium uppercase tracking-wider text-[--color-mist-400]">具体问题（可选）</div>
              <textarea
                className="input mt-2 min-h-[120px]"
                maxLength={500}
                placeholder="你想了解什么？（≤ 500 字）"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <p className="mt-1 text-xs text-[--color-mist-400]">{question.length}/500</p>
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleRun}
              disabled={!chartId || status === 'streaming'}
            >
              {status === 'streaming' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {status === 'streaming' ? '解读中…' : '开始解读'}
            </button>

            {!chartId && (
              <p className="text-xs text-[--color-vermilion]">
                URL 缺少 chart_id 参数。请从命盘页进入。
              </p>
            )}
          </div>

          {/* Main — streaming output */}
          <div className="lg:col-span-2">
            <div className="card min-h-[300px]">
              {status === 'idle' && (
                <p className="text-sm text-[--color-mist-400]">点击左侧"开始解读"以生成 AI 解读。</p>
              )}

              {status !== 'idle' && (
                <div className="prose prose-sm max-w-none text-[--color-ink]">
                  <ReactMarkdown>{text}</ReactMarkdown>
                  {status === 'streaming' && (
                    <span className="inline-block h-4 w-2 animate-pulse bg-[--color-vermilion]" />
                  )}
                </div>
              )}

              {error && <p className="mt-4 text-sm text-[--color-vermilion]">错误：{error}</p>}

              {status === 'done' && readingId && (
                <div className="mt-6 border-t border-[--color-ink]/10 pt-4">
                  {fellBack && (
                    <div className="mb-3 rounded-lg bg-[--color-bronze]/10 p-3 text-xs text-[--color-bronze]">
                      首选模型不可用，已自动切换至备份模型。本次解读不计入配额。
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Rating disabled={rated} onRate={handleRate} />
                    <button className="btn-ghost" onClick={() => { reset(); void handleRun(); }}>
                      <RefreshCw size={16} /> 重新生成
                    </button>
                  </div>
                  {typeof qualityScore === 'number' && (
                    <p className="mt-2 text-xs text-[--color-mist-400]">质量分：{qualityScore}/100</p>
                  )}
                </div>
              )}
            </div>

            <Disclaimer />
          </div>
        </div>
      </PageContainer>
    </>
  )
}

function Rating({ onRate, disabled }: { onRate: (n: 1 | 2 | 3 | 4 | 5) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-2 text-xs text-[--color-mist-400]">这次解读怎么样？</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="text-2xl text-[--color-mist-300] hover:text-[--color-bronze] disabled:opacity-50"
          disabled={disabled}
          onClick={() => onRate(n as 1 | 2 | 3 | 4 | 5)}
          aria-label={`rate ${n}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
