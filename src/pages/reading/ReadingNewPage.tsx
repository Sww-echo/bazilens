import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Sparkles, RefreshCw, BatteryFull, Loader2 } from 'lucide-react'

import { useReading } from '@/hooks/useReading'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useQuotaStore } from '@/stores/quotaStore'
import { rateReading } from '@/api/readings'
import { UpgradeModal } from '@/components/UpgradeModal'

const SCENES = [
  { id: 'marriage', label: '婚姻' },
  { id: 'career', label: '事业' },
  { id: 'wealth', label: '财运' },
  { id: 'health', label: '健康' },
  { id: 'study', label: '学业' },
] as const

type Scene = typeof SCENES[number]['id']

const PROMPT_VERSION_BY_SCENE: Record<Scene, string> = {
  marriage: 'bazi-marriage-v1',
  career: 'bazi-career-v1',
  wealth: 'bazi-wealth-v1',
  health: 'bazi-health-v1',
  study: 'bazi-study-v1',
}

const PLACEHOLDER_BULLETS = [
  '核心优势：命局中官印相生，暗示您具备良好的管理能力与学习力，在职场中易得长辈或贵人提携。',
  '近期机遇：未来三个月内，尤其在金秋时节，将有新的项目或职位变动机会，建议提前做好知识储备。',
  '潜在挑战：需注意工作与生活的平衡，避免因过度投入事业而忽略健康，适当的休息将有助于长远发展。',
]

export default function ReadingNewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const chartId = params.get('chart_id') ?? ''
  const tier = useSubscriptionStore((s) => s.tier)
  const remaining = useQuotaStore((s) => s.remainingForTier(tier))
  const [scene, setScene] = useState<Scene>('career')
  const [stars, setStars] = useState<number>(0)
  const [rated, setRated] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const { text, status, error, readingId, run, reset } = useReading()

  async function handleRun() {
    if (!chartId) return
    if (remaining <= 0) {
      setShowUpgrade(true)
      return
    }
    setRated(false)
    setStars(0)
    await run({
      chart_id: chartId,
      scene,
      prompt_version: PROMPT_VERSION_BY_SCENE[scene] ?? 'bazi-career-v1',
    })
  }

  async function handleRate(n: number) {
    if (!readingId) return
    setStars(n)
    await rateReading(readingId, n as 1 | 2 | 3 | 4 | 5)
    setRated(true)
  }

  const showPlaceholder = status === 'idle'
  const isStreaming = status === 'streaming'

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6">
      <div>
        <h1 className="serif text-3xl font-semibold leading-tight">命盘：我的本命盘</h1>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-[--color-mist-500]">AI 详细解读</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[--color-jade]/15 px-3 py-1 text-xs font-medium text-[--color-jade]">
            <BatteryFull size={12} />
            {tier === 'free' ? `Free ${Math.max(0, 3 - remaining)}/3` : `Plus ${Math.max(0, 30 - remaining)}/30`}
          </span>
        </div>
      </div>

      {/* Scene pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SCENES.map((s) => {
          const active = scene === s.id
          return (
            <button
              key={s.id}
              onClick={() => setScene(s.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[--color-vermilion] text-white shadow-sm'
                  : 'border border-[--color-ink]/15 bg-white text-[--color-ink] hover:bg-[--color-mist-50]'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Reading card */}
      <article className="mt-6 rounded-xl border border-[--color-ink]/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[--color-vermilion]" />
          <h2 className="serif text-2xl font-semibold">总览</h2>
        </div>

        {showPlaceholder ? (
          <button
            onClick={handleRun}
            disabled={!chartId}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft] disabled:opacity-60"
          >
            <Sparkles size={16} /> 开始解读
          </button>
        ) : (
          <>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-[--color-ink]">
              {text ? (
                <div className="prose prose-sm max-w-none text-[--color-ink]">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              ) : isStreaming ? (
                <p className="text-[--color-mist-500]">正在生成详细解读…</p>
              ) : (
                <>
                  <p>基于您的八字命盘分析，您在事业发展上具有显著的特质与潜力。当前处于关键的流年交替之际，整体呈现出稳中求进的态势。</p>
                  <ul className="space-y-3">
                    {PLACEHOLDER_BULLETS.map((b, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[--color-vermilion]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {isStreaming && (
              <div className="mt-5 flex items-center gap-2 text-xs text-[--color-mist-500]">
                <Loader2 size={14} className="animate-spin" />
                正在生成详细建议…
              </div>
            )}
            {!isStreaming && status === 'done' && (
              <div className="mt-5 flex items-center gap-2 text-xs italic text-[--color-mist-500]">
                <span className="text-base">✎</span>
                正在生成详细建议…
              </div>
            )}
          </>
        )}

        {error && <p className="mt-4 text-sm text-[--color-vermilion]">错误：{error}</p>}
      </article>

      {/* Star rating */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={rated || !readingId}
            onClick={() => void handleRate(n)}
            aria-label={`rate ${n}`}
            className="text-3xl transition-colors disabled:opacity-100"
          >
            <Star filled={n <= stars} />
          </button>
        ))}
      </div>

      {/* Regenerate */}
      <button
        onClick={() => {
          reset()
          void handleRun()
        }}
        disabled={!chartId || isStreaming}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-[--color-ink]/15 bg-white px-6 py-3 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50] disabled:opacity-60"
      >
        <RefreshCw size={16} /> 重新生成
      </button>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false)
          navigate('/upgrade')
        }}
      />
    </div>
  )
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2.95 6.4 7.05.7-5.3 4.9 1.5 6.95L12 17.9 5.8 21.45l1.5-6.95L2 9.6l7.05-.7L12 2.5z"
        fill={filled ? '#C4A661' : 'none'}
        stroke={filled ? '#C4A661' : '#B3AC97'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
