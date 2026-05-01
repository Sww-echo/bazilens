import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { startSubscriptionCheckout, type CheckoutLookupKey } from '@/api/subscriptions'
import { Disclaimer } from '@/components/Disclaimer'

const TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    monthly: 0,
    yearly: 0,
    perks: ['每月 3 次 DeepSeek 解读', '基础八字 + 紫微排盘', '解读历史 30 天'],
    cta: null,
  },
  {
    id: 'plus' as const,
    name: 'Plus',
    monthly: 4.99,
    yearly: 39.99,
    perks: ['每月 30 次 GPT-4.1 解读', '历史无限保存', '简繁双语'],
    cta: 'plus',
    highlight: true,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    monthly: 9.99,
    yearly: 79.99,
    perks: ['每月 200 次 Claude 解读', '流年大运（Sprint 2）', '合盘对比（Sprint 2）'],
    cta: 'pro',
  },
]

export default function UpgradePage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [busyTier, setBusyTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(tier: 'plus' | 'pro') {
    setBusyTier(tier)
    setError(null)
    try {
      const lookup_key: CheckoutLookupKey = `${tier}_${period}` as CheckoutLookupKey
      const { url } = await startSubscriptionCheckout(lookup_key)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyTier(null)
    }
  }

  return (
    <>
      <PageHeader title="选择适合你的档位" subtitle="所有档位均可单独购买详批 PDF" />
      <PageContainer>
        {/* Period toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-[--color-ink]/15 p-1">
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  period === p ? 'bg-[--color-ink] text-white' : 'text-[--color-mist-500]'
                }`}
              >
                {p === 'monthly' ? '月付' : '年付'}
                {p === 'yearly' && (
                  <span className="ml-2 rounded-full bg-[--color-vermilion]/15 px-2 py-0.5 text-xs text-[--color-vermilion]">
                    省 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`card relative ${t.highlight ? 'border-[--color-vermilion] shadow-md' : ''}`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[--color-vermilion] px-3 py-1 text-xs font-medium text-white">
                  最受欢迎
                </span>
              )}
              <h3 className="serif text-2xl">{t.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-semibold">${period === 'monthly' ? t.monthly : t.yearly}</span>
                <span className="ml-1 text-sm text-[--color-mist-400]">
                  {t.id === 'free' ? '永久' : period === 'monthly' ? '/月' : '/年'}
                </span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.perks.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 text-[--color-jade]" />
                    {p}
                  </li>
                ))}
              </ul>
              {t.cta ? (
                <button
                  className={`mt-6 w-full ${t.highlight ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleCheckout(t.cta as 'plus' | 'pro')}
                  disabled={busyTier === t.cta}
                >
                  {busyTier === t.cta ? <Loader2 size={16} className="animate-spin" /> : null}
                  选择 {t.name}
                </button>
              ) : (
                <p className="mt-6 text-center text-xs text-[--color-mist-400]">默认档位</p>
              )}
            </div>
          ))}
        </div>

        {/* PDF callout */}
        <div id="pdf" className="mt-12 card border-2 border-[--color-bronze]/40 bg-[--color-bronze]/5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="badge bg-[--color-bronze]/15 text-[--color-bronze]">单独购买</span>
              <h3 className="serif mt-2 text-xl">详批 PDF · 八字一生总论</h3>
              <p className="mt-1 text-sm text-[--color-mist-500]">
                7 章 5000-8000 字，专业排版可下载收藏。
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl font-semibold">$14.99</div>
              <p className="text-xs text-[--color-mist-500]">单次付费 · 不订阅</p>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-center text-sm text-[--color-vermilion]">{error}</p>}

        <Disclaimer />
      </PageContainer>
    </>
  )
}
