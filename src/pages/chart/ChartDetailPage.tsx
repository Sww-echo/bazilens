import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Sparkles, FileText } from 'lucide-react'

import { getChart } from '@/api/charts'
import { extractBaziChart, extractZiweiChart } from '@/lib/chart-builders'

type Pillar = {
  label: 'Hour' | 'Day' | 'Month' | 'Year'
  tg: string
  dz: string
  shenSha: string
  hidden: string
  highlight?: boolean
}

const FALLBACK_PILLARS: Pillar[] = [
  { label: 'Hour', tg: '戊', dz: '戌', shenSha: '七杀', hidden: '丁辛戊' },
  { label: 'Day', tg: '辛', dz: '酉', shenSha: '比肩', hidden: '辛', highlight: true },
  { label: 'Month', tg: '庚', dz: '午', shenSha: '劫财', hidden: '丁己' },
  { label: 'Year', tg: '甲', dz: '子', shenSha: '正财', hidden: '癸' },
]

const FALLBACK_FIVE: Record<string, number> = { 金: 42, 木: 15, 水: 12, 火: 18, 土: 13 }

export default function ChartDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [chart, setChart] = useState<Awaited<ReturnType<typeof getChart>>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'bazi' | 'ziwei' | 'compare'>('bazi')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        setChart(await getChart(id))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const bazi = chart ? extractBaziChart(chart.chart_data) : null
  const ziwei = chart ? extractZiweiChart(chart.chart_data) : null

  return (
    <div className="flex min-h-screen flex-col bg-[--color-paper]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[--color-ink]/10 bg-[--color-paper]">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-ink] hover:bg-[--color-mist-100]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="serif flex-1 text-center text-lg font-semibold">
            {chart?.title || '我的本命盘'}
          </h1>
          <button
            type="button"
            aria-label="share"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-ink] hover:bg-[--color-mist-100]"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[--color-paper-2]/55">
        <div className="mx-auto grid max-w-3xl grid-cols-3 px-4 text-sm">
          {([
            { v: 'bazi', label: '八字盘' },
            { v: 'ziwei', label: '紫微盘' },
            { v: 'compare', label: '合盘对比' },
          ] as const).map((opt) => {
            const active = tab === opt.v
            return (
              <button
                key={opt.v}
                onClick={() => setTab(opt.v)}
                className={`relative pb-3 pt-3 transition-colors ${
                  active ? 'font-semibold text-[--color-vermilion]' : 'text-[--color-mist-500]'
                }`}
              >
                {opt.label}
                {active && (
                  <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-[--color-vermilion]" />
                )}
              </button>
            )
          })}
        </div>
        <div className="-mt-px h-px bg-[--color-ink]/10" />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">
        {loading && <p className="text-sm text-[--color-mist-400]">加载中…</p>}
        {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}

        {!loading && !error && (
          <>
            {tab === 'bazi' && (
              <BaziPanel pillars={pillarsFromChart(bazi) ?? FALLBACK_PILLARS} five={fiveFromChart(bazi) ?? FALLBACK_FIVE} />
            )}
            {tab === 'ziwei' && (
              <div className="rounded-xl border border-[--color-ink]/10 bg-white p-6">
                <h2 className="serif text-lg">紫微盘</h2>
                <p className="mt-2 text-sm text-[--color-mist-500]">
                  {ziwei ? '紫微 12 宫视图建设中。' : '此命盘未包含紫微数据。'}
                </p>
              </div>
            )}
            {tab === 'compare' && (
              <div className="rounded-xl border border-[--color-ink]/10 bg-white p-6">
                <h2 className="serif text-lg">合盘对比</h2>
                <p className="mt-2 text-sm text-[--color-mist-500]">合盘对比将在 Sprint 2 上线。</p>
              </div>
            )}
          </>
        )}

        {/* CTA buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate(`/reading/new?chart_id=${id}`)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-4 text-base font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
          >
            <Sparkles size={18} /> 开始 AI 解读
          </button>
          <Link
            to={`/upgrade?chart_id=${id}#pdf`}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[--color-ink]/20 bg-white px-6 py-3.5 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
          >
            <FileText size={18} /> PDF $14.99
          </Link>
        </div>
      </main>
    </div>
  )
}

function BaziPanel({ pillars, five }: { pillars: Pillar[]; five: Record<string, number> }) {
  return (
    <div className="rounded-xl border border-[--color-ink]/10 bg-white p-5 shadow-sm">
      {/* Four pillars */}
      <div className="grid grid-cols-4 gap-2">
        {pillars.map((p) => (
          <div
            key={p.label}
            className={`rounded-md border px-2 pb-3 pt-3 text-center ${
              p.highlight ? 'border-[--color-ink]/15 bg-[--color-paper-2]/60' : 'border-[--color-ink]/10 bg-white'
            }`}
          >
            <div className="flex justify-center text-[--color-mist-400]">
              <PillarIcon />
            </div>
            <div
              className={`mt-1 text-xs ${p.highlight ? 'font-semibold text-[--color-vermilion]' : 'text-[--color-mist-400]'}`}
            >
              ({p.label})
            </div>
            <div
              className={`glyph mt-2 text-3xl leading-none ${p.highlight ? 'text-[--color-vermilion]' : ''}`}
            >
              {p.tg}
            </div>
            <div
              className={`glyph mt-1 text-3xl leading-none ${p.highlight ? 'text-[--color-vermilion]' : ''}`}
            >
              {p.dz}
            </div>
            <div className="mt-3 inline-flex rounded bg-[--color-mist-100] px-1.5 py-0.5 text-[11px] text-[--color-mist-500]">
              {p.shenSha}
            </div>
            <div className="mt-1.5 text-[11px] text-[--color-mist-500]">{p.hidden}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-[--color-ink]/10" />

      {/* Five elements */}
      <h2 className="serif text-xl font-semibold">五行力量分布 (Five Elements)</h2>

      <FiveDonut data={five} />

      <div className="mt-5 grid grid-cols-2 gap-3">
        {(['金', '木', '水', '火', '土'] as const).map((el) => (
          <div
            key={el}
            className="flex items-center justify-center rounded-md border border-[--color-ink]/10 bg-white px-4 py-4 text-center"
          >
            <div>
              <div className="glyph text-2xl">{el}</div>
              <div className="mt-0.5 text-sm text-[--color-mist-500]">{five[el] ?? 0}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PillarIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden="true">
      <rect x="2" y="1" width="10" height="16" rx="1" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="13" x2="9" y2="13" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function FiveDonut({ data }: { data: Record<string, number> }) {
  const elements = ['金', '木', '水', '火', '土'] as const
  const colors: Record<string, string> = {
    金: '#C4A661',
    木: '#7A9E9F',
    水: '#1A2332',
    火: '#C8553D',
    土: '#B3AC97',
  }
  const total = elements.reduce((s, k) => s + (data[k] ?? 0), 0) || 1
  const cx = 80
  const cy = 80
  const r = 60
  const stroke = 18

  let acc = 0
  const segs = elements.map((el) => {
    const v = data[el] ?? 0
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += v
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2
    return { el, startAngle, endAngle, color: colors[el] }
  })

  const arcPath = (sa: number, ea: number) => {
    const sx = cx + r * Math.cos(sa)
    const sy = cy + r * Math.sin(sa)
    const ex = cx + r * Math.cos(ea)
    const ey = cy + r * Math.sin(ea)
    const large = ea - sa > Math.PI ? 1 : 0
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`
  }

  return (
    <div className="mt-5 flex justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label="五行分布">
        <circle cx={cx} cy={cy} r={r} stroke="#EFEAD9" strokeWidth={stroke} fill="none" />
        {segs.map((s, i) => (
          <path
            key={i}
            d={arcPath(s.startAngle, s.endAngle)}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-[--color-mist-500]" fontSize="11">
          Distribution Chart
        </text>
      </svg>
    </div>
  )
}

function pillarsFromChart(_data: unknown): Pillar[] | null {
  return null
}

function fiveFromChart(_data: unknown): Record<string, number> | null {
  return null
}
