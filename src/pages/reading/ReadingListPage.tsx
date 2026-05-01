import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'

import { listReadings, type ReadingRow } from '@/api/readings'

const SCENE_LABEL: Record<string, string> = {
  marriage: '婚姻',
  career: '事业',
  wealth: '财运',
  health: '健康',
  study: '学业',
}

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
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-8">
      <h1 className="serif text-4xl font-semibold tracking-tight">AI Reading</h1>
      <p className="mt-2 text-sm text-[--color-mist-500]">按时间倒序展示所有 AI 解读</p>

      {loading && <p className="mt-6 text-sm text-[--color-mist-400]">加载中…</p>}

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-[--color-ink]/15 bg-white/60 p-10 text-center">
          <Sparkles size={28} className="mx-auto text-[--color-mist-400]" />
          <p className="serif mt-3 text-lg font-semibold">还没有解读</p>
          <p className="mt-1 text-sm text-[--color-mist-500]">从命盘开始一次 AI 深度解读</p>
          <Link
            to="/charts"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-[--color-ink]/15 bg-white px-5 py-2.5 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
          >
            查看我的命盘
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[--color-ink]/10 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="serif text-lg font-semibold">
                    {SCENE_LABEL[r.scene] ?? r.scene}
                  </h3>
                  <StatusChip status={r.status} />
                </div>
                <div className="mt-1 text-xs text-[--color-mist-500]">
                  {new Date(r.created_at).toLocaleString('zh-CN')}
                  {r.model && <> · {r.model}</>}
                </div>
              </div>
              <div className="flex flex-none items-center gap-2 text-xs text-[--color-bronze]">
                {r.rating ? <span>★ {r.rating}/5</span> : null}
                <ChevronRight size={18} className="text-[--color-mist-400]" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const completed = status === 'completed' || status === 'done'
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        completed
          ? 'bg-[--color-jade]/15 text-[--color-jade]'
          : 'bg-[--color-mist-100] text-[--color-mist-500]'
      }`}
    >
      {status}
    </span>
  )
}
