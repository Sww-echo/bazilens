import { PageContainer, PageHeader } from '@/components/PageHeader'

export default function AdminTicketsPage() {
  return (
    <>
      <PageHeader title="客服工单" subtitle="管理员视图（仅 is_admin = true 可见）" />
      <PageContainer>
        <div className="card">
          <p className="text-sm text-[--color-mist-500]">
            占位页面。完整实现见 <code>docs/TECH_SPEC.md §15.4</code> + <code>docs/PLAN.md §14</code>。
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[--color-mist-500]">
            <li>列表视图：按 priority + created_at 排序</li>
            <li>过滤：status / category / priority</li>
            <li>详情抽屉：原文 + 回复历史 + 关联 reading/report</li>
            <li>一键操作：[退款 + 回复] [升级] [关闭]</li>
          </ul>
        </div>
      </PageContainer>
    </>
  )
}
