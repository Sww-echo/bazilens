import { useParams } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { Disclaimer } from '@/components/Disclaimer'
import { useReportProgress } from '@/hooks/useReportProgress'

export default function ReportDetailPage() {
  const { id = '' } = useParams()
  const { report, status, progress, downloadUrl, error } = useReportProgress(id)

  return (
    <>
      <PageHeader
        title={titleFor(report?.type)}
        subtitle={report ? `编号 ${report.id.slice(0, 8).toUpperCase()}` : ''}
      />
      <PageContainer>
        <div className="card mx-auto max-w-2xl">
          {status === 'loading' && <p className="text-sm text-[--color-mist-400]">加载中…</p>}

          {(status === 'paid' || status === 'generating') && (
            <div className="text-center">
              <Loader2 size={32} className="mx-auto animate-spin text-[--color-vermilion]" />
              <h2 className="serif mt-4 text-xl">详批生成中</h2>
              <ProgressBar value={progress} />
              <p className="mt-2 text-xs text-[--color-mist-500]">
                预计 1-2 分钟。完成后会发送邮件通知，您可以离开此页面。
              </p>
            </div>
          )}

          {status === 'ready' && downloadUrl && (
            <div className="text-center">
              <div className="text-3xl">✓</div>
              <h2 className="serif mt-4 text-xl">您的报告已生成</h2>
              <p className="mt-2 text-sm text-[--color-mist-500]">下载链接 24 小时内有效。</p>
              <a href={downloadUrl} className="btn-primary mt-6 inline-flex" download>
                <Download size={16} /> 下载 PDF
              </a>
            </div>
          )}

          {status === 'failed' && (
            <div>
              <h2 className="serif text-xl text-[--color-vermilion]">生成失败</h2>
              <p className="mt-2 text-sm text-[--color-mist-500]">
                我们遇到了一个生成问题。系统将自动为您退款 ${report?.amount_usd?.toFixed(2) ?? '14.99'}，
                5-10 个工作日到账。
              </p>
              <a href="mailto:support@bazilens.app" className="btn-secondary mt-4 inline-flex">
                联系客服
              </a>
            </div>
          )}

          {status === 'refunded' && (
            <div>
              <h2 className="serif text-xl">已退款</h2>
              <p className="mt-2 text-sm text-[--color-mist-500]">
                金额 ${report?.refund_amount_usd?.toFixed(2) ?? '14.99'} 已退回原支付方式。
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-[--color-vermilion]">错误：{error}</p>}
        </div>
        <Disclaimer />
      </PageContainer>
    </>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-6">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[--color-mist-100]">
        <div
          className="h-full bg-[--color-vermilion] transition-all duration-500"
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[--color-mist-400]">{value}%</p>
    </div>
  )
}

function titleFor(type: string | undefined): string {
  if (!type) return '详批报告'
  if (type === 'full_bazi') return '八字一生总论'
  if (type === 'liunian') return '流年大运'
  if (type === 'compatibility') return '合盘'
  if (type === 'ziwei_full') return '紫微一生总论'
  return type
}
