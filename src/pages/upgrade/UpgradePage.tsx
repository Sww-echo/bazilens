import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Check, FileText } from 'lucide-react'

import { startSubscriptionCheckout, type CheckoutLookupKey } from '@/api/subscriptions'

export default function UpgradePage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [busyTier, setBusyTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const FAQS = [
    { q: t('faq.refundQ', 'What is the refund policy?'), a: t('faq.refundA', 'We offer a 7-day scholarly review period. If the insights do not meet your expectations, a full refund will be provided upon request.') },
    { q: t('faq.cancelQ', 'How do I cancel my subscription?'), a: t('faq.cancelA', 'Cancellations can be managed directly through your account settings at any time. Your access will continue until the end of the current billing cycle.') },
  ]

  async function handleCheckout(tier: 'plus' | 'pro') {
    setBusyTier(tier)
    setError(null)
    try {
      const periodKey = period === 'monthly' ? 'monthly' : 'yearly'
      const lookup_key: CheckoutLookupKey = `${tier}_${periodKey}` as CheckoutLookupKey
      const { url } = await startSubscriptionCheckout(lookup_key)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyTier(null)
    }
  }

  const isAnnual = period === 'annual'

  return (
    <div className="mx-auto max-w-3xl px-5 pb-12 pt-8">
      <div className="text-center">
        <h1 className="serif text-4xl font-semibold leading-tight tracking-tight">{t('upgrade.title')}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[--color-mist-500]">
          {t('upgrade.subtitle')}
        </p>
      </div>

      {/* Period toggle */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-full bg-[--color-mist-200]/60 p-1">
          <button
            onClick={() => setPeriod('monthly')}
            className={`rounded-full px-6 py-1.5 text-sm font-medium transition-colors ${
              !isAnnual ? 'bg-[--color-ink] text-white shadow-sm' : 'text-[--color-mist-500]'
            }`}
          >
            {t('upgrade.monthly')}
          </button>
          <button
            onClick={() => setPeriod('annual')}
            className={`rounded-full px-6 py-1.5 text-sm font-medium transition-colors ${
              isAnnual ? 'bg-[--color-ink] text-white shadow-sm' : 'text-[--color-mist-500]'
            }`}
          >
            {t('upgrade.annual')}
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="mt-8 space-y-5">
        <TierCard
          name={t('upgrade.free')}
          price={0}
          period={isAnnual ? t('upgrade.perYear') : t('upgrade.perMonth')}
          perks={[t('upgrade.freePerk1'), t('upgrade.freePerk2')]}
          cta={{ label: t('upgrade.currentPlan'), kind: 'ghost', disabled: true }}
        />

        <TierCard
          name={t('upgrade.plus')}
          price={isAnnual ? 49.99 : 4.99}
          period={isAnnual ? t('upgrade.perYear') : t('upgrade.perMonth')}
          perks={[t('upgrade.plusPerk1'), t('upgrade.plusPerk2'), t('upgrade.plusPerk3')]}
          highlight
          recommendedLabel={t('upgrade.recommended')}
          cta={{
            label: busyTier === 'plus' ? t('upgrade.loading') : t('upgrade.upgradeToPlus'),
            kind: 'primary',
            disabled: busyTier === 'plus',
            onClick: () => handleCheckout('plus'),
          }}
        />

        <TierCard
          name={t('upgrade.pro')}
          price={isAnnual ? 99.99 : 9.99}
          period={isAnnual ? t('upgrade.perYear') : t('upgrade.perMonth')}
          perks={[t('upgrade.proPerk1'), t('upgrade.proPerk2'), t('upgrade.proPerk3')]}
          cta={{
            label: busyTier === 'pro' ? t('upgrade.loading') : t('upgrade.upgradeToPro'),
            kind: 'ghost',
            disabled: busyTier === 'pro',
            onClick: () => handleCheckout('pro'),
          }}
        />
      </div>

      {/* PDF one-time */}
      <section id="pdf" className="mt-10 rounded-xl border border-[--color-ink]/10 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <FileText size={22} className="mt-1.5 text-[--color-ink]" />
          <h2 className="serif text-2xl font-semibold leading-tight">
            {t('upgrade.oneTimeReport')}
          </h2>
        </div>
        <p className="mt-3 text-sm text-[--color-mist-500]">
          {t('upgrade.oneTimeReportBody')}
        </p>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[--color-mist-500]">
          {t('upgrade.noSubscriptionNeeded')}
        </p>
        <p className="mt-1 text-right">
          <span className="serif text-3xl font-semibold">$14.99</span>
        </p>
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-[--color-ink]/15 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wider text-[--color-ink] hover:bg-[--color-mist-50]">
          {t('upgrade.purchaseReport')}
        </button>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="serif text-center text-3xl font-semibold leading-tight">
          {t('upgrade.faqTitle')}
        </h2>
        <div className="mx-auto mt-4 h-px w-12 bg-[--color-mist-300]" />
        <div className="mt-6 space-y-6">
          {FAQS.map((f, i) => (
            <div key={i} className="border-b border-[--color-ink]/8 pb-6 last:border-0">
              <h3 className="serif text-xl font-semibold">{f.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[--color-mist-500]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="mt-6 text-center text-sm text-[--color-vermilion]">{error}</p>}
    </div>
  )
}

type Cta = { label: string; kind: 'primary' | 'ghost'; disabled?: boolean; onClick?: () => void }

function TierCard({
  name,
  price,
  period,
  perks,
  highlight,
  recommendedLabel,
  cta,
}: {
  name: string
  price: number
  period: string
  perks: string[]
  highlight?: boolean
  recommendedLabel?: string
  cta: Cta
}) {
  return (
    <article
      className={`relative rounded-xl border bg-white p-6 shadow-sm ${
        highlight ? 'border-[--color-ink]' : 'border-[--color-ink]/10'
      }`}
    >
      {highlight && recommendedLabel && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-[--color-ink] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          {recommendedLabel}
        </span>
      )}
      <h3 className="serif text-2xl font-semibold">{name}</h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="serif text-5xl font-semibold tracking-tight">${price}</span>
        <span className="text-sm text-[--color-mist-500]">{period}</span>
      </p>

      <ul className="mt-5 space-y-3 text-sm">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 flex-none text-[--color-ink]" strokeWidth={2.5} />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={cta.disabled}
        onClick={cta.onClick}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
          cta.kind === 'primary'
            ? 'bg-[--color-vermilion] text-white hover:bg-[--color-vermilion-soft] disabled:opacity-60'
            : 'border border-[--color-ink]/15 bg-white text-[--color-ink] hover:bg-[--color-mist-50] disabled:opacity-60'
        }`}
      >
        {cta.disabled && cta.label === 'Loading…' && <Loader2 size={14} className="animate-spin" />}
        {cta.label}
      </button>
    </article>
  )
}
