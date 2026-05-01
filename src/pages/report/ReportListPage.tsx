import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
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
    <>
      <PageHeader title="详批报告" subtitle="所有已购买的 PDF 详批，可重新下载" />
      <PageContainer>
        {loading && <p className="text-sm text-[--color-mist-400]">加载中…</p>}
        {!loading && items.length === 0 && (
          <div className="card text-center">
            <p className="text-sm text-[--color-mist-500]">还没有详批报告。</p>
            <Link to="/charts" className="btn-secondary mt-4">从命盘购买</Link>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Link to={`/report/${r.id}`} key={r.id} className="card group transition hover:border-[--color-vermilion]/30">
              <div className="flex items-center justify-between">
                <h3 className="serif text-lg group-hover:text-[--color-vermilion]">{titleFor(r.type)}</h3>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-2 text-xs text-[--color-mist-400]">
                {new Date(r.created_at).toLocaleString('zh-CN')}
              </div>
              {r.amount_usd != null && (
                <div className="mt-1 text-xs text-[--color-mist-500]">${r.amount_usd.toFixed(2)}</div>
              )}
              {r.status === 'generating' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[--color-mist-500]">
                  <Loader2 size={14} className="animate-spin" /> 生成中 {r.progress}%
                </div>
              )}
              {r.status === 'ready' && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-[--color-vermilion]">
                  <Download size={14} /> 下载
                </div>
              )}
            </Link>
          ))}
        </div>
      </PageContainer>
    </>
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
  const map: Record<ReportRow['status'], string> = {
    pending: 'badge-free',
    paid: 'badge-plus',
    generating: 'badge-plus',
    ready: 'badge-plus',
    failed: 'badge-vermilion',
    refunded: 'badge-free',
  }
  const label: Record<ReportRow['status'], string> = {
    pending: '待付款',
    paid: '已付款',
    generating: '生成中',
    ready: '已就绪',
    failed: '失败',
    refunded: '已退款',
  }
  return <span className={map[status]}>{label[status]}</span>
}
