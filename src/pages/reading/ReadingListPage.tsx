import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { listReadings, type ReadingRow } from '@/api/readings'

export default function ReadingListPage() {
  const [items, setItems] = useState<ReadingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listReadings(undefined, 100))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <>
      <PageHeader title="解读历史" subtitle="按时间倒序展示所有 AI 解读" />
      <PageContainer>
        {loading && <p className="text-sm text-[--color-mist-400]">加载中…</p>}
        {!loading && items.length === 0 && (
          <div className="card text-center text-sm text-[--color-mist-500]">
            还没有解读记录。
            <div className="mt-3">
              <Link to="/charts" className="btn-secondary">查看我的命盘</Link>
            </div>
          </div>
        )}
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{r.scene}</div>
                <div className="text-xs text-[--color-mist-400]">
                  {new Date(r.created_at).toLocaleString('zh-CN')} · {r.model ?? r.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${r.status === 'completed' ? 'bg-[--color-jade]/15 text-[--color-jade]' : 'bg-[--color-mist-100] text-[--color-mist-500]'}`}>
                  {r.status}
                </span>
                {r.rating ? <span className="text-xs text-[--color-bronze]">★ {r.rating}/5</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </PageContainer>
    </>
  )
}
