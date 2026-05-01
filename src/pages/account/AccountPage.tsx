import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Loader2, Download, SlidersHorizontal } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useQuotaStore } from '@/stores/quotaStore'
import { useSubscription } from '@/hooks/useSubscription'
import { openCustomerPortal } from '@/api/subscriptions'
import { signOut } from '@/api/auth'
import { supabase } from '@/api/client'

const READING_LIMITS: Record<'free' | 'plus' | 'pro', number> = {
  free: 3,
  plus: 30,
  pro: 200,
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const tier = useSubscriptionStore((s) => s.tier)
  const periodEnd = useSubscriptionStore((s) => s.currentPeriodEnd)
  const remaining = useQuotaStore((s) => s.remainingForTier(tier))
  const { row, loading } = useSubscription()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limit = READING_LIMITS[tier]
  const used = Math.max(0, limit - remaining)
  const usedPct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 text-center">
        <h1 className="serif text-3xl font-semibold">Account</h1>
        <p className="mt-3 text-sm text-[--color-mist-500]">请先登录。</p>
        <Link
          to="/auth/sign-in"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3 text-sm font-medium text-white"
        >
          登录
        </Link>
      </div>
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
    <div className="bg-[#EEF1F6]">
      <div className="mx-auto max-w-3xl px-5 pb-10 pt-8">
        <h1 className="serif text-4xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-[--color-mist-500]">
          Manage your profile, preferences, and subscription.
        </p>

        {/* Profile */}
        <section className="mt-8 flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[--color-mist-200]">
            <ProfileAvatar />
          </div>
          <div>
            <h2 className="serif text-2xl font-semibold">{displayName(user.email)}</h2>
            {tier !== 'free' && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[--color-jade]/15 px-3 py-1 text-xs font-semibold text-[--color-jade]">
                <Award size={12} />
                {tier === 'plus' ? 'Plus Member' : 'Pro Member'}
              </span>
            )}
          </div>
        </section>

        <hr className="mt-8 border-[--color-ink]/8" />

        {/* Subscription card */}
        <section className="mt-6 rounded-xl border border-[--color-ink]/10 bg-white p-6">
          <div className="flex items-start justify-between">
            <h3 className="serif text-2xl font-semibold">Subscription</h3>
            <Award size={18} className="text-[--color-mist-400]" />
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[--color-mist-500]">
            Current Plan
          </p>
          <p className="mt-1 text-base font-semibold text-[--color-ink]">
            BaziLens {tier === 'free' ? 'Free' : tier === 'plus' ? 'Plus' : 'Pro'}
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[--color-mist-500]">
            Next Billing Date
          </p>
          <p className="mt-1 text-base text-[--color-ink]">
            {periodEnd
              ? periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </p>

          <div className="mt-5">
            {row?.stripe_subscription_id ? (
              <button
                onClick={handleManageSubscription}
                disabled={busy || loading}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-[--color-ink]/15 bg-white px-4 py-3 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50] disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                Manage Subscription
              </button>
            ) : (
              <Link
                to="/upgrade"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-4 py-3 text-sm font-medium text-white hover:bg-[--color-vermilion-soft]"
              >
                Upgrade to Plus / Pro
              </Link>
            )}
          </div>
        </section>

        {/* Quota card */}
        <section className="mt-6 rounded-xl border border-[--color-ink]/10 bg-white p-6">
          <div className="flex items-start justify-between">
            <h3 className="serif text-2xl font-semibold">Quota Usage</h3>
            <RingIcon />
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="serif text-4xl font-semibold">{used}</span>
            <span className="text-sm text-[--color-mist-500]">/ {limit} readings</span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[--color-ink]/8">
            <div
              className="h-full rounded-full bg-[--color-jade] transition-all"
              style={{ width: `${usedPct}%` }}
            />
          </div>

          <p className="mt-3 text-sm italic text-[--color-mist-500]">
            Resets on {nextResetLabel(periodEnd)}
          </p>
        </section>

        {/* Privacy & Data */}
        <h3 className="serif mt-8 text-2xl font-semibold">Privacy &amp; Data</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-[--color-ink]/10 bg-white">
          <ListRow
            label="Export My Data"
            icon={<Download size={18} className="text-[--color-mist-500]" />}
            onClick={handleExportData}
            disabled={busy}
          />
          <div className="h-px bg-[--color-ink]/8" />
          <ListRow
            label="Cookie Preferences"
            icon={<SlidersHorizontal size={18} className="text-[--color-mist-500]" />}
            disabled={busy}
          />
        </div>

        <hr className="mt-8 border-[--color-ink]/8" />

        <button
          onClick={handleDeleteAccount}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-[--color-vermilion-soft] disabled:opacity-60"
        >
          Delete Account
        </button>
        <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-relaxed text-[--color-mist-500]">
          Permanently remove your account and all associated Bazi readings. This action cannot be undone.
        </p>

        {error && <p className="mt-4 text-center text-sm text-[--color-vermilion]">{error}</p>}

        <button onClick={() => void signOut()} className="mt-6 w-full text-center text-sm text-[--color-mist-500] hover:text-[--color-ink]">
          退出登录
        </button>
      </div>
    </div>
  )
}

function ListRow({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-[--color-ink] transition-colors hover:bg-[--color-mist-50] disabled:opacity-50"
    >
      <span className="font-semibold">{label}</span>
      {icon}
    </button>
  )
}

function ProfileAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#DCD5C2" />
      <circle cx="32" cy="26" r="11" fill="#5C5648" />
      <path d="M10 60 C 14 44, 50 44, 54 60 Z" fill="#5C5648" />
    </svg>
  )
}

function RingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#B3AC97" strokeWidth="1.6" />
      <path d="M12 3 a 9 9 0 0 1 9 9" stroke="#7A9E9F" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function displayName(email: string | undefined) {
  if (!email) return 'Scholar'
  const [name] = email.split('@')
  return name
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || 'Scholar'
}

function nextResetLabel(periodEnd: Date | null) {
  if (!periodEnd) {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
