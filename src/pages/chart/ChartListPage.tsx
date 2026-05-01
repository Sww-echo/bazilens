import { Link } from 'react-router-dom'
import { Plus, Star, ChevronRight } from 'lucide-react'

import { useCharts } from '@/hooks/useCharts'

export default function ChartListPage() {
  const { charts, loading, error } = useCharts()

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="serif text-4xl font-semibold tracking-tight">My Charts</h1>
          <p className="mt-2 text-sm text-[--color-mist-500]">所有已创建的八字 / 紫微命盘</p>
        </div>
        <Link
          to="/chart/new"
          aria-label="new chart"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[--color-vermilion] text-white shadow-sm hover:bg-[--color-vermilion-soft]"
        >
          <Plus size={20} />
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-[--color-mist-400]">加载中…</p>}
      {error && <p className="mt-6 text-sm text-[--color-vermilion]">{error}</p>}

      {!loading && charts.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-[--color-ink]/15 bg-white/60 p-10 text-center">
          <p className="serif text-lg font-semibold">还没有命盘</p>
          <p className="mt-1 text-sm text-[--color-mist-500]">从你的出生信息开始</p>
          <Link
            to="/chart/new"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus size={16} /> 创建第一个命盘
          </Link>
        </div>
      )}

      {charts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {charts.map((c) => (
            <li key={c.id}>
              <Link
                to={`/chart/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[--color-ink]/10 bg-white p-4 transition-colors hover:border-[--color-vermilion]/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="serif truncate text-lg font-semibold">{c.title || '未命名命盘'}</h3>
                    {c.is_favorite && (
                      <Star size={14} className="flex-none fill-[--color-bronze] text-[--color-bronze]" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[--color-mist-500]">
                    <span className="rounded bg-[--color-mist-100] px-1.5 py-0.5 font-medium text-[--color-mist-500]">
                      {c.type.toUpperCase()}
                    </span>
                    <span>{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
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
