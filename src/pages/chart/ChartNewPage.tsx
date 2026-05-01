import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Clock, MapPin, Sparkles, Loader2 } from 'lucide-react'

import { useCharts } from '@/hooks/useCharts'
import {
  buildBaziChartInput,
  buildZiweiChartInput,
  buildCombinedChartInput,
  type ChartFormInput,
} from '@/lib/chart-builders'

const TIME_LABELS = [
  '子时 (23:00-00:59)', '丑时 (01:00-02:59)', '寅时 (03:00-04:59)', '卯时 (05:00-06:59)',
  '辰时 (07:00-08:59)', '巳时 (09:00-10:59)', '午时 (11:00-12:59)', '未时 (13:00-14:59)',
  '申时 (15:00-16:59)', '酉时 (17:00-18:59)', '戌时 (19:00-20:59)', '亥时 (21:00-22:59)',
]

const VARIANTS: { v: 'bazi' | 'ziwei' | 'combined'; label: string }[] = [
  { v: 'bazi', label: '八字' },
  { v: 'ziwei', label: '紫微' },
  { v: 'combined', label: '八字+紫微' },
]

export default function ChartNewPage() {
  const navigate = useNavigate()
  const { create } = useCharts()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [variant, setVariant] = useState<'bazi' | 'ziwei' | 'combined'>('bazi')
  const [form, setForm] = useState<ChartFormInput>({
    title: '',
    gender: 'male',
    dateType: 'solar',
    year: '1991',
    month: '5',
    day: '20',
    isLeapMonth: false,
    timeIndex: 6,
    useTrueSolarTime: false,
    birthHour: '12',
    birthMinute: '00',
    birthPlace: '',
    birthLongitude: '',
  })

  function update<K extends keyof ChartFormInput>(key: K, value: ChartFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const input =
        variant === 'bazi'
          ? await buildBaziChartInput(form)
          : variant === 'ziwei'
            ? await buildZiweiChartInput(form)
            : await buildCombinedChartInput(form)
      const { id } = await create(input)
      navigate(`/chart/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[--color-paper]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[--color-ink]/10 bg-[--color-paper]">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-ink] hover:bg-[--color-mist-100]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="serif flex-1 text-center text-lg font-semibold">创建新命盘</h1>
          <span className="w-9" />
        </div>
      </header>

      <form onSubmit={submit} className="flex flex-1 flex-col">
        {/* Top section — variant tabs, name, gender (paper-2 background) */}
        <section className="bg-[--color-paper-2]/55 px-5 pb-7 pt-4">
          <div className="mx-auto max-w-3xl">
            {/* Variant tabs */}
            <div className="grid grid-cols-3 text-sm">
              {VARIANTS.map((opt) => {
                const active = variant === opt.v
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setVariant(opt.v)}
                    className={`relative pb-3 pt-2 transition-colors ${
                      active ? 'font-semibold text-[--color-vermilion]' : 'text-[--color-mist-500]'
                    }`}
                  >
                    {opt.label}
                    {active && (
                      <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-[--color-vermilion]" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="-mt-px h-px bg-[--color-ink]/10" />

            {/* Name */}
            <div className="mt-5">
              <Label>姓名 (选填)</Label>
              <UnderlineInput
                placeholder="输入姓名"
                value={form.title}
                onChange={(v) => update('title', v)}
              />
            </div>

            {/* Gender */}
            <div className="mt-5">
              <Label>性别</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <GenderCard
                  selected={form.gender === 'male'}
                  onClick={() => update('gender', 'male')}
                  label="男 (乾造)"
                  symbol="♂"
                />
                <GenderCard
                  selected={form.gender === 'female'}
                  onClick={() => update('gender', 'female')}
                  label="女 (坤造)"
                  symbol="♀"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bottom section — calendar, date, time, location */}
        <section className="flex-1 px-5 pt-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Calendar */}
            <div>
              <Label>历法</Label>
              <div className="mt-2 flex gap-6">
                <RadioPill
                  selected={form.dateType === 'solar'}
                  onClick={() => update('dateType', 'solar')}
                  label="公历 (阳历)"
                />
                <RadioPill
                  selected={form.dateType === 'lunar'}
                  onClick={() => update('dateType', 'lunar')}
                  label="农历 (阴历)"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <Label>出生日期</Label>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <DateSelect
                  value={form.year}
                  onChange={(v) => update('year', v)}
                  suffix="年"
                  min={1900}
                  max={2100}
                />
                <DateSelect
                  value={form.month}
                  onChange={(v) => update('month', v)}
                  suffix="月"
                  min={1}
                  max={12}
                  pad
                />
                <DateSelect
                  value={form.day}
                  onChange={(v) => update('day', v)}
                  suffix="日"
                  min={1}
                  max={31}
                  pad
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <Label>出生时间 (可选)</Label>
              <div className="relative mt-2">
                <Clock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-mist-400]"
                />
                <select
                  value={typeof form.timeIndex === 'number' ? form.timeIndex : ''}
                  onChange={(e) =>
                    update('timeIndex', e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={form.useTrueSolarTime}
                  className="w-full appearance-none border-0 border-b border-[--color-ink]/15 bg-transparent py-2 pl-9 pr-8 text-sm text-[--color-ink] focus:border-[--color-ink] focus:outline-none focus:ring-0 disabled:opacity-60"
                >
                  <option value="">请选择时辰</option>
                  {TIME_LABELS.map((l, i) => (
                    <option key={i} value={i}>{l}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[--color-mist-400]"
                />
              </div>
              <p className="mt-2 text-xs text-[--color-mist-400]">
                精确的时间能提供更准确的命盘分析。
              </p>

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[--color-mist-500]">
                <input
                  type="checkbox"
                  checked={form.useTrueSolarTime}
                  onChange={(e) => update('useTrueSolarTime', e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[--color-ink]/30"
                />
                我知道精确时间（启用真太阳时）
              </label>

              {form.useTrueSolarTime && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="时"
                      value={form.birthHour}
                      onChange={(e) => update('birthHour', e.target.value)}
                      className="w-full border-0 border-b border-[--color-ink]/15 bg-transparent py-2 pr-8 text-sm focus:border-[--color-ink] focus:outline-none focus:ring-0"
                    />
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-[--color-mist-400]">时</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="分"
                      value={form.birthMinute}
                      onChange={(e) => update('birthMinute', e.target.value)}
                      className="w-full border-0 border-b border-[--color-ink]/15 bg-transparent py-2 pr-8 text-sm focus:border-[--color-ink] focus:outline-none focus:ring-0"
                    />
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-[--color-mist-400]">分</span>
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <Label>出生地点</Label>
              <div className="relative mt-2">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[--color-mist-400]"
                />
                <input
                  type="text"
                  placeholder="搜索城市或地区..."
                  value={form.birthPlace}
                  onChange={(e) => update('birthPlace', e.target.value)}
                  className="w-full border-0 border-b border-[--color-ink]/15 bg-transparent py-2 pl-7 text-sm text-[--color-ink] placeholder:text-[--color-mist-400] focus:border-[--color-ink] focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}
          </div>
        </section>

        {/* CTA bar */}
        <div className="sticky bottom-0 mt-8 border-t border-[--color-ink]/10 bg-[--color-paper] p-4">
          <div className="mx-auto max-w-3xl">
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-4 text-base font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft] disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              开始排盘
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-semibold text-[--color-ink]">{children}</span>
}

function UnderlineInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full border-0 border-b border-[--color-ink]/15 bg-transparent py-2 text-sm text-[--color-ink] placeholder:text-[--color-mist-400] focus:border-[--color-ink] focus:outline-none focus:ring-0"
    />
  )
}

function GenderCard({
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
        selected
          ? 'border-[--color-ink] text-[--color-ink]'
          : 'border-[--color-ink]/15 text-[--color-mist-500]'
      }`}
    >
      <span className="text-2xl leading-none">{symbol}</span>
      <span className="mt-2 text-sm">{label}</span>
    </button>
  )
}

function RadioPill({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm" onClick={onClick}>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
          selected ? 'border-[--color-vermilion]' : 'border-[--color-ink]/25'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-[--color-vermilion]" />}
      </span>
      <span className={selected ? 'text-[--color-ink]' : 'text-[--color-mist-500]'}>{label}</span>
    </label>
  )
}

function DateSelect({
  value,
  onChange,
  suffix,
  min,
  max,
  pad,
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  min: number
  max: number
  pad?: boolean
}) {
  const options: number[] = []
  for (let i = min; i <= max; i++) options.push(i)
  return (
    <div className="relative flex items-center">
      <div className="relative flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border-0 border-b border-[--color-ink]/15 bg-transparent py-2 pr-7 text-sm text-[--color-ink] focus:border-[--color-ink] focus:outline-none focus:ring-0"
        >
          {options.map((n) => (
            <option key={n} value={String(n)}>
              {pad ? String(n).padStart(2, '0') : n}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[--color-mist-400]"
        />
      </div>
      <span className="ml-2 text-sm text-[--color-mist-500]">{suffix}</span>
    </div>
  )
}
