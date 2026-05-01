import { useParams } from 'react-router-dom'
import { Download, MailCheck } from 'lucide-react'

import { useReportProgress } from '@/hooks/useReportProgress'

const FALLBACK_PROGRESS = 42
const CHAPTERS = [
  '排盘计算',
  'Personality & Life Path',
  'Career & Wealth',
  'Relationships',
  'Health',
  'Five-year Outlook',
  'Concluding Notes',
]

export default function ReportDetailPage() {
  const { id = '' } = useParams()
  const { report, status, progress, downloadUrl, error } = useReportProgress(id)

  const pct = progress || FALLBACK_PROGRESS
  const chapter = chapterFor(pct)

  return (
    <div className="bg-[#EEF1F6]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="serif text-center text-4xl font-semibold tracking-tight">Report Status</h1>

        {/* Brush illustration */}
        <div className="mt-8 flex justify-center">
          <BrushArt />
        </div>

        {status === 'ready' && downloadUrl ? (
          <ReadyView href={downloadUrl} />
        ) : status === 'failed' ? (
          <FailedView />
        ) : status === 'refunded' ? (
          <RefundedView amount={report?.refund_amount_usd} />
        ) : (
          <ProgressView pct={pct} chapter={chapter} />
        )}

        {error && status !== 'failed' && (
          <p className="mt-4 text-center text-sm text-[--color-vermilion]">错误：{error}</p>
        )}
      </div>
    </div>
  )
}

function ProgressView({ pct, chapter }: { pct: number; chapter: { idx: number; total: number; title: string } }) {
  return (
    <>
      <p className="mt-8 text-center text-base text-[--color-ink]">
        Chapter {chapter.idx}/{chapter.total}: {chapter.title}
      </p>
      <p className="mt-2 text-center text-sm text-[--color-mist-500]">
        Analyzing Ten Gods…
      </p>

      <div className="mx-auto mt-6 max-w-sm">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--color-ink]/10">
          <div
            className="h-full rounded-full bg-[--color-ink] transition-all duration-500"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[--color-mist-500]">
          <span>0%</span>
          <span className="font-semibold text-[--color-ink]">{pct}%</span>
          <span>100%</span>
        </div>
      </div>

      <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-[--color-mist-500]">
        Estimated Time: Approx. 1-2 Minutes
      </p>

      <div className="mx-auto mt-5 max-w-sm rounded-xl border border-[--color-ink]/8 bg-[--color-mist-50]/80 px-6 py-5 text-center">
        <MailCheck size={18} className="mx-auto text-[--color-mist-500]" />
        <p className="mt-2 text-sm text-[--color-ink]">
          You can leave this page; we'll email you when it's ready.
        </p>
      </div>
    </>
  )
}

function ReadyView({ href }: { href: string }) {
  return (
    <div className="mt-8 text-center">
      <p className="serif text-2xl font-semibold">Your report is ready</p>
      <p className="mt-2 text-sm text-[--color-mist-500]">下载链接 24 小时内有效。</p>
      <a
        href={href}
        download
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
      >
        <Download size={16} /> Download PDF
      </a>
    </div>
  )
}

function FailedView() {
  return (
    <div className="mt-8 text-center">
      <p className="serif text-2xl font-semibold text-[--color-vermilion]">生成失败</p>
      <p className="mt-2 text-sm text-[--color-mist-500]">
        我们遇到了一个生成问题。系统将自动为您退款，5–10 个工作日到账。
      </p>
      <a
        href="mailto:support@bazilens.app"
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-[--color-ink]/20 bg-white px-5 py-2.5 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
      >
        联系客服
      </a>
    </div>
  )
}

function RefundedView({ amount }: { amount?: number | null }) {
  return (
    <div className="mt-8 text-center">
      <p className="serif text-2xl font-semibold">已退款</p>
      <p className="mt-2 text-sm text-[--color-mist-500]">
        金额 ${amount?.toFixed(2) ?? '14.99'} 已退回原支付方式。
      </p>
    </div>
  )
}

function BrushArt() {
  return (
    <div className="relative h-32 w-32">
      <div className="absolute inset-0 rounded-full bg-[--color-paper-2] shadow-[0_8px_30px_-10px_rgba(26,35,50,0.3)]" />
      <div className="absolute inset-3 overflow-hidden rounded-full bg-gradient-to-br from-[--color-mist-100] to-[--color-paper-2]">
        <span
          className="absolute left-3 top-3 select-none text-3xl font-bold text-[--color-jade]/65"
          style={{ fontFamily: 'var(--font-glyph)' }}
        >
          命
        </span>
        <span
          className="absolute right-2 bottom-3 select-none text-2xl font-bold text-[--color-jade]/45"
          style={{ fontFamily: 'var(--font-glyph)' }}
        >
          盘
        </span>
        <svg
          viewBox="0 0 80 80"
          className="absolute right-1 top-2 h-16 w-16 -rotate-12"
          aria-hidden="true"
        >
          <line x1="58" y1="6" x2="22" y2="60" stroke="#1A2332" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M 16 64 Q 22 60, 28 56 L 22 70 Q 18 70, 16 64 Z"
            fill="#1A2332"
          />
          <circle cx="62" cy="6" r="2.5" fill="#C4A661" />
        </svg>
      </div>
    </div>
  )
}

function chapterFor(pct: number) {
  const total = CHAPTERS.length
  const idx = Math.min(total, Math.max(1, Math.ceil((pct / 100) * total)))
  return { idx, total, title: CHAPTERS[idx - 1] ?? CHAPTERS[CHAPTERS.length - 1] }
}
