import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Sparkles, Star } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { Disclaimer } from '@/components/Disclaimer'
import { getChart, toggleFavoriteChart, type ChartType } from '@/api/charts'
import { extractBaziChart, extractZiweiChart } from '@/lib/chart-builders'

export default function ChartDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [chart, setChart] = useState<Awaited<ReturnType<typeof getChart>>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <PageContainer><p className="text-sm text-[--color-mist-400]">加载中…</p></PageContainer>
  if (error) return <PageContainer><p className="text-sm text-[--color-vermilion]">{error}</p></PageContainer>
  if (!chart) return <PageContainer><p>命盘不存在。</p></PageContainer>

  const bazi = extractBaziChart(chart.chart_data)
  const ziwei = extractZiweiChart(chart.chart_data)

  return (
    <>
      <PageHeader
        title={chart.title || '命盘详情'}
        subtitle={`${(chart.type as ChartType).toUpperCase()} · 创建于 ${new Date(chart.created_at).toLocaleString('zh-CN')}`}
        actions={
          <>
            <button
              className="btn-ghost"
              onClick={async () => {
                await toggleFavoriteChart(chart.id, !chart.is_favorite)
                setChart({ ...chart, is_favorite: !chart.is_favorite })
              }}
            >
              <Star size={16} className={chart.is_favorite ? 'fill-[--color-bronze] text-[--color-bronze]' : ''} />
              {chart.is_favorite ? '已收藏' : '收藏'}
            </button>
            <Link className="btn-ghost" to="/charts">
              <ArrowLeft size={16} /> 返回列表
            </Link>
          </>
        }
      />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="serif text-lg">命盘数据（占位）</h2>
            <p className="mt-2 text-sm text-[--color-mist-500]">
              这里将渲染八字四柱 / 紫微 12 宫的真实视图。等 UI 稿到位后会替换。
              当前显示一个原始 JSON snapshot 供调试。
            </p>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-[--color-mist-50] p-4 text-xs">
              {JSON.stringify({ bazi: !!bazi, ziwei: !!ziwei, raw_keys: Object.keys((chart.chart_data as Record<string, unknown>) ?? {}) }, null, 2)}
            </pre>
          </div>

          <div className="space-y-3">
            <button
              className="btn-primary w-full"
              onClick={() => navigate(`/reading/new?chart_id=${chart.id}`)}
            >
              <Sparkles size={16} /> 开始 AI 解读
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => navigate(`/upgrade?chart_id=${chart.id}#pdf`)}
            >
              <FileText size={16} /> 详批 PDF $14.99
            </button>
            <Disclaimer inline />
          </div>
        </div>
      </PageContainer>
    </>
  )
}
