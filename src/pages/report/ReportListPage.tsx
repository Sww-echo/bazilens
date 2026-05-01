import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Loader2, FileText, ChevronRight } from 'lucide-react'

import { listReports, type ReportRow } from '@/api/reports'

export default function ReportListPage() {
  const [items, setItems] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listReports(50))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-8">
      <h1 className="serif text-4xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-2 text-sm text-[--color-mist-500]">所有已购买的 PDF 详批，可重新下载</p>

      {loading && <p className="mt-6 text-sm text-[--color-mist-400]">加载中…</p>}

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-[--color-ink]/15 bg-white/60 p-10 text-center">
          <FileText size={28} className="mx-auto text-[--color-mist-400]" />
          <p className="serif mt-3 text-lg font-semibold">还没有详批报告</p>
          <p className="mt-1 text-sm text-[--color-mist-500]">从命盘单独购买详批</p>
          <Link
            to="/charts"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-[--color-ink]/15 bg-white px-5 py-2.5 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
          >
            从命盘购买
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                to={`/report/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[--color-ink]/10 bg-white p-4 transition-colors hover:border-[--color-vermilion]/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="serif truncate text-lg font-semibold">{titleFor(r.type)}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[--color-mist-500]">
                    <span>{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                    {r.amount_usd != null && <span>· ${r.amount_usd.toFixed(2)}</span>}
                  </div>
                  {r.status === 'generating' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[--color-mist-500]">
                      <Loader2 size={12} className="animate-spin" /> 生成中 {r.progress}%
                    </div>
                  )}
                  {r.status === 'ready' && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[--color-vermilion]">
                      <Download size={12} /> 可下载
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="flex-none text-[--color-mist-400]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function titleFor(type: string): string {
  if (type === 'full_bazi') return '八字一生总论'
  if (type === 'liunian') return '流年大运'
  if (type === 'compatibility') return '合盘'
  if (type === 'ziwei_full') return '紫微一生总论'
  return type
}

function StatusBadge({ status }: { status: ReportRow['status'] }) {
  const map: Record<ReportRow['status'], { label: string; cls: string }> = {
    pending: { label: '待付款', cls: 'bg-[--color-mist-100] text-[--color-mist-500]' },
    paid: { label: '已付款', cls: 'bg-[--color-jade]/15 text-[--color-jade]' },
    generating: { label: '生成中', cls: 'bg-[--color-jade]/15 text-[--color-jade]' },
    ready: { label: '已就绪', cls: 'bg-[--color-vermilion]/12 text-[--color-vermilion]' },
    failed: { label: '失败', cls: 'bg-[--color-vermilion]/12 text-[--color-vermilion]' },
    refunded: { label: '已退款', cls: 'bg-[--color-mist-100] text-[--color-mist-500]' },
  }
  const m = map[status]
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>{m.label}</span>
}
