import { Link } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import { useCharts } from '@/hooks/useCharts'
import { PageContainer, PageHeader } from '@/components/PageHeader'

export default function ChartListPage() {
  const { charts, loading, error } = useCharts()

  return (
    <>
      <PageHeader
        title="我的命盘"
        subtitle="所有已创建的八字 / 紫微命盘"
        actions={
          <Link to="/chart/new" className="btn-primary">
            <Plus size={16} /> 创建新命盘
          </Link>
        }
      />
      <PageContainer>
        {loading && <p className="text-sm text-[--color-mist-400]">加载中…</p>}
        {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}
        {!loading && charts.length === 0 && (
          <div className="card text-center">
            <p className="text-sm text-[--color-mist-500]">还没有命盘。</p>
            <Link to="/chart/new" className="btn-primary mt-4">
              <Plus size={16} /> 创建第一个命盘
            </Link>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((c) => (
            <Link key={c.id} to={`/chart/${c.id}`} className="card group transition hover:border-[--color-vermilion]/30 hover:shadow-md">
              <div className="flex items-start justify-between">
                <h3 className="serif text-lg group-hover:text-[--color-vermilion]">{c.title}</h3>
                {c.is_favorite && <Star size={16} className="fill-[--color-bronze] text-[--color-bronze]" />}
              </div>
              <div className="mt-2 text-xs text-[--color-mist-400]">
                {c.type.toUpperCase()} · {new Date(c.created_at).toLocaleDateString('zh-CN')}
              </div>
            </Link>
          ))}
        </div>
      </PageContainer>
    </>
  )
}
