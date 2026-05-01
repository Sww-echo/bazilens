import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, Sparkles, Globe2 } from 'lucide-react'

import { useConsentStore } from '@/stores/consentStore'

const TOTAL_STEPS = 3
const STORAGE_KEY = 'bazilens.onboarded.v1'

const TIME_LABELS = [
  '子时 (23-01)', '丑时 (01-03)', '寅时 (03-05)', '卯时 (05-07)',
  '辰时 (07-09)', '巳时 (09-11)', '午时 (11-13)', '未时 (13-15)',
  '申时 (15-17)', '酉时 (17-19)', '戌时 (19-21)', '亥时 (21-23)',
]

type QuickForm = {
  gender: 'male' | 'female'
  year: string
  month: string
  day: string
  timeIndex: number
}

const DEFAULT_FORM: QuickForm = {
  gender: 'male',
  year: '1995',
  month: '6',
  day: '15',
  timeIndex: 6,
}

export default function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const saveConsent = useConsentStore((s) => s.save)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<QuickForm>(DEFAULT_FORM)

  function complete() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    navigate('/charts', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[--color-paper]">
      <header className="sticky top-0 z-30 border-b border-[--color-ink]/10 bg-[--color-paper]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              aria-label="back"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-ink] hover:bg-[--color-mist-100]"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="w-9" />
          )}
          <p className="text-xs uppercase tracking-wider text-[--color-mist-500]">
            {t('onboarding.step', { n: step, total: TOTAL_STEPS })}
          </p>
          <button
            onClick={complete}
            className="text-sm text-[--color-mist-500] hover:text-[--color-ink]"
          >
            {t('onboarding.skip')}
          </button>
        </div>
        <Dots step={step} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        {step === 1 && (
          <Step1
            currentLang={i18n.language}
            onNext={(lang, full) => {
              void i18n.changeLanguage(lang)
              saveConsent({ analytics: full, errors: full })
              setStep(2)
            }}
          />
        )}
        {step === 2 && (
          <Step2
            form={form}
            onChange={setForm}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && <Step3 onFinish={complete} />}
      </main>
    </div>
  )
}

function Dots({ step }: { step: number }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 pb-3">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === step ? 'w-8 bg-[--color-vermilion]' : 'w-1.5 bg-[--color-mist-300]'
          }`}
        />
      ))}
    </div>
  )
}

function Step1({
  currentLang,
  onNext,
}: {
  currentLang: string
  onNext: (lang: string, fullConsent: boolean) => void
}) {
  const { t } = useTranslation()
  const [lang, setLang] = useState(currentLang.startsWith('zh') ? currentLang : 'zh-CN')
  const [fullConsent, setFullConsent] = useState(true)

  const langs = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'en', label: 'English' },
  ]

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[--color-vermilion]/15 text-[--color-vermilion]">
        <Globe2 size={28} />
      </div>
      <h1 className="serif mt-5 text-3xl font-semibold leading-tight">{t('onboarding.welcomeTitle')}</h1>
      <p className="mt-3 text-sm text-[--color-mist-500]">{t('onboarding.welcomeBody')}</p>

      <div className="mt-7 text-left">
        <span className="block text-xs font-semibold text-[--color-ink]">{t('onboarding.languageLabel')}</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {langs.map((l) => {
            const active = lang === l.code
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[--color-ink] bg-white text-[--color-ink]'
                    : 'border-[--color-ink]/15 bg-white text-[--color-mist-500] hover:border-[--color-ink]/40'
                }`}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 text-left">
        <span className="block text-xs font-semibold text-[--color-ink]">{t('onboarding.consentLabel')}</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ConsentTile
            selected={!fullConsent}
            label={t('onboarding.consentMinimal')}
            onClick={() => setFullConsent(false)}
          />
          <ConsentTile
            selected={fullConsent}
            label={t('onboarding.consentFull')}
            onClick={() => setFullConsent(true)}
          />
        </div>
      </div>

      <button
        onClick={() => onNext(lang, fullConsent)}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
      >
        {t('onboarding.next')} <ChevronRight size={16} />
      </button>
    </div>
  )
}

function Step2({
  form,
  onChange,
  onNext,
}: {
  form: QuickForm
  onChange: (next: QuickForm) => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const arr: number[] = []
    for (let y = now; y >= 1900; y--) arr.push(y)
    return arr
  }, [])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), [])

  function update<K extends keyof QuickForm>(key: K, value: QuickForm[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-3xl font-semibold leading-tight">{t('onboarding.quickTitle')}</h1>
      <p className="mt-2 text-sm text-[--color-mist-500]">{t('onboarding.quickBody')}</p>

      <div className="mt-7 space-y-6">
        <div>
          <span className="block text-xs font-semibold text-[--color-ink]">{t('chart.gender')}</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <ChoiceCard
              selected={form.gender === 'male'}
              onClick={() => update('gender', 'male')}
              label={t('chart.male')}
              symbol="♂"
            />
            <ChoiceCard
              selected={form.gender === 'female'}
              onClick={() => update('gender', 'female')}
              label={t('chart.female')}
              symbol="♀"
            />
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-[--color-ink]">{t('chart.birthDate')}</span>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <SimpleSelect
              value={form.year}
              onChange={(v) => update('year', v)}
              options={years.map((n) => ({ value: String(n), label: String(n) }))}
            />
            <SimpleSelect
              value={form.month}
              onChange={(v) => update('month', v)}
              options={months.map((n) => ({ value: String(n), label: String(n).padStart(2, '0') }))}
            />
            <SimpleSelect
              value={form.day}
              onChange={(v) => update('day', v)}
              options={days.map((n) => ({ value: String(n), label: String(n).padStart(2, '0') }))}
            />
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-[--color-ink]">{t('chart.birthTime')}</span>
          <SimpleSelect
            className="mt-2"
            value={String(form.timeIndex)}
            onChange={(v) => update('timeIndex', Number(v))}
            options={TIME_LABELS.map((l, i) => ({ value: String(i), label: l }))}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
      >
        {t('onboarding.next')} <ChevronRight size={16} />
      </button>
    </div>
  )
}

function Step3({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[--color-jade]/15 text-[--color-jade]">
        <Sparkles size={28} />
      </div>
      <h1 className="serif mt-5 text-center text-3xl font-semibold leading-tight">
        {t('onboarding.sampleTitle')}
      </h1>
      <p className="mt-3 text-center text-sm text-[--color-mist-500]">
        {t('onboarding.sampleBody')}
      </p>

      <article className="mt-6 rounded-xl border border-[--color-ink]/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[--color-vermilion]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[--color-vermilion]">
            {t('reading.overview')}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[--color-ink]">
          {t('onboarding.samplePreview')}
        </p>
      </article>

      <div className="mt-7 space-y-3">
        <button
          onClick={onFinish}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
        >
          <Sparkles size={16} /> {t('onboarding.sampleStart')}
        </button>
        <button
          onClick={onFinish}
          className="w-full rounded-md border border-[--color-ink]/15 bg-white px-6 py-3 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
        >
          {t('onboarding.finishGoCharts')}
        </button>
      </div>
    </div>
  )
}

function ConsentTile({
  selected,
  label,
  onClick,
}: {
  selected: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
        selected
          ? 'border-[--color-ink] bg-white text-[--color-ink]'
          : 'border-[--color-ink]/15 bg-white text-[--color-mist-500] hover:border-[--color-ink]/40'
      }`}
    >
      {label}
    </button>
  )
}

function ChoiceCard({
  selected,
  onClick,
  label,
  symbol,
}: {
  selected: boolean
  onClick: () => void
  label: string
  symbol: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg border-2 bg-white px-4 py-5 text-sm transition-colors ${
        selected ? 'border-[--color-ink] text-[--color-ink]' : 'border-[--color-ink]/15 text-[--color-mist-500]'
      }`}
    >
      <span className="text-2xl leading-none">{symbol}</span>
      <span className="mt-2 text-sm">{label}</span>
    </button>
  )
}

function SimpleSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-md border border-[--color-ink]/15 bg-white px-3 py-2.5 text-sm text-[--color-ink] focus:border-[--color-ink]/40 focus:outline-none focus:ring-2 focus:ring-[--color-ink]/10 ${className ?? ''}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return true }
}

export function markOnboardedManually() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
}
