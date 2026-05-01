import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useQuotaStore } from '@/stores/quotaStore'
import { useSubscription } from '@/hooks/useSubscription'
import { openCustomerPortal } from '@/api/subscriptions'
import { signOut } from '@/api/auth'
import { supabase } from '@/api/client'

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const tier = useSubscriptionStore((s) => s.tier)
  const status = useSubscriptionStore((s) => s.status)
  const periodEnd = useSubscriptionStore((s) => s.currentPeriodEnd)
  const remaining = useQuotaStore((s) => s.remainingForTier(tier))
  const { row, loading } = useSubscription()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <PageContainer>
        <div className="card text-center">
          <p className="text-sm text-[--color-mist-500]">请先登录。</p>
          <Link to="/auth/sign-in" className="btn-primary mt-4">登录</Link>
        </div>
      </PageContainer>
    )
  }

  async function handleManageSubscription() {
    setBusy(true)
    setError(null)
    try {
      const { url } = await openCustomerPortal()
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleExportData() {
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not_authenticated')
      window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-export`
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('确认要注销账号？我们将在 30 天后永久删除您的数据。')) return
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not_authenticated')
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? `http_${r.status}`)
      await signOut()
      alert('账号注销已安排，30 天内可登录恢复。')
      window.location.href = '/'
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="账户" subtitle={user.email ?? ''} />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="订阅">
            {loading ? (
              <p className="text-sm text-[--color-mist-400]">加载中…</p>
            ) : (
              <>
                <p className="text-sm">
                  当前档位：<span className="font-medium uppercase">{tier}</span>
                  <span className="ml-2 text-xs text-[--color-mist-400]">{status}</span>
                </p>
                {periodEnd && (
                  <p className="mt-1 text-xs text-[--color-mist-500]">
                    下次续费：{periodEnd.toLocaleDateString('zh-CN')}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  {row?.stripe_subscription_id ? (
                    <button className="btn-secondary" onClick={handleManageSubscription} disabled={busy}>
                      {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                      管理订阅 / 取消
                    </button>
                  ) : (
                    <Link to="/upgrade" className="btn-primary">升级到 Plus / Pro</Link>
                  )}
                </div>
              </>
            )}
          </Section>

          <Section title="本月配额">
            <p className="text-sm">
              AI 解读：剩余 <span className="font-medium">{remaining}</span> 次
            </p>
            <p className="mt-2 text-xs text-[--color-mist-500]">每月 1 日重置</p>
          </Section>

          <Section title="数据与隐私" full>
            <div className="space-y-3">
              <div>
                <p className="text-sm">导出我的全部数据（GDPR Art. 15）</p>
                <button className="btn-secondary mt-2" onClick={handleExportData} disabled={busy}>
                  导出 JSON
                </button>
              </div>
              <div className="border-t border-[--color-ink]/10 pt-3">
                <p className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-[--color-vermilion]" />
                  注销账号 — 30 天 grace period 后永久删除
                </p>
                <button
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[--color-vermilion] px-4 py-2 text-sm text-[--color-vermilion] hover:bg-[--color-vermilion]/5"
                  onClick={handleDeleteAccount}
                  disabled={busy}
                >
                  注销我的账号
                </button>
              </div>
            </div>
          </Section>
        </div>

        {error && <p className="mt-4 text-sm text-[--color-vermilion]">{error}</p>}

        <div className="mt-8 text-center">
          <button className="btn-ghost" onClick={() => void signOut()}>退出登录</button>
        </div>
      </PageContainer>
    </>
  )
}

function Section({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`card ${full ? 'lg:col-span-2' : ''}`}>
      <h2 className="serif text-lg">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}
