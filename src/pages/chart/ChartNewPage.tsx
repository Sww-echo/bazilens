import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { useCharts } from '@/hooks/useCharts'
import { buildBaziChartInput, buildZiweiChartInput, buildCombinedChartInput, type ChartFormInput } from '@/lib/chart-builders'

const TIME_INDEX_LABELS = [
  '子时 23:00-01:00', '丑时 01:00-03:00', '寅时 03:00-05:00', '卯时 05:00-07:00',
  '辰时 07:00-09:00', '巳时 09:00-11:00', '午时 11:00-13:00', '未时 13:00-15:00',
  '申时 15:00-17:00', '酉时 17:00-19:00', '戌时 19:00-21:00', '亥时 21:00-23:00',
]

export default function ChartNewPage() {
  const navigate = useNavigate()
  const { create } = useCharts()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [variant, setVariant] = useState<'bazi' | 'ziwei' | 'combined'>('combined')
  const [form, setForm] = useState<ChartFormInput>({
    title: '',
    gender: 'male',
    dateType: 'solar',
    year: '1995',
    month: '6',
    day: '15',
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
    <>
      <PageHeader title="创建新命盘" subtitle="填写出生信息开始排盘" />
      <PageContainer>
        <form onSubmit={submit} className="card mx-auto max-w-2xl space-y-6">
          {/* Variant tabs */}
          <div className="inline-flex rounded-lg border border-[--color-ink]/15 p-1">
            {[
              { v: 'combined', label: '八字 + 紫微（推荐）' },
              { v: 'bazi', label: '仅八字' },
              { v: 'ziwei', label: '仅紫微' },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setVariant(opt.v as typeof variant)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  variant === opt.v ? 'bg-[--color-ink] text-white' : 'text-[--color-mist-500]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <Field label="命盘名称（可选）">
            <input
              className="input"
              placeholder="如：我的本命盘"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </Field>

          {/* Gender */}
          <Field label="性别">
            <div className="flex gap-3">
              <Radio checked={form.gender === 'male'} onChange={() => update('gender', 'male')}>男</Radio>
              <Radio checked={form.gender === 'female'} onChange={() => update('gender', 'female')}>女</Radio>
            </div>
          </Field>

          {/* Calendar */}
          <Field label="历法">
            <div className="flex gap-3">
              <Radio checked={form.dateType === 'solar'} onChange={() => update('dateType', 'solar')}>阳历</Radio>
              <Radio checked={form.dateType === 'lunar'} onChange={() => update('dateType', 'lunar')}>阴历</Radio>
            </div>
          </Field>

          {/* Date */}
          <Field label="生日">
            <div className="grid grid-cols-3 gap-2">
              <input className="input" type="number" min="1900" max="2100" placeholder="年" value={form.year} onChange={(e) => update('year', e.target.value)} />
              <input className="input" type="number" min="1" max="12" placeholder="月" value={form.month} onChange={(e) => update('month', e.target.value)} />
              <input className="input" type="number" min="1" max="31" placeholder="日" value={form.day} onChange={(e) => update('day', e.target.value)} />
            </div>
            {form.dateType === 'lunar' && (
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-[--color-mist-500]">
                <input type="checkbox" checked={form.isLeapMonth} onChange={(e) => update('isLeapMonth', e.target.checked)} />
                闰月
              </label>
            )}
          </Field>

          {/* Time */}
          <Field label="时辰">
            <select
              className="input"
              value={typeof form.timeIndex === 'number' ? form.timeIndex : ''}
              onChange={(e) => update('timeIndex', e.target.value === '' ? '' : Number(e.target.value))}
              disabled={form.useTrueSolarTime}
            >
              <option value="">— 请选择 —</option>
              {TIME_INDEX_LABELS.map((l, i) => (
                <option key={i} value={i}>{l}</option>
              ))}
            </select>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-[--color-mist-500]">
              <input type="checkbox" checked={form.useTrueSolarTime} onChange={(e) => update('useTrueSolarTime', e.target.checked)} />
              我知道精确时间（启用真太阳时）
            </label>
            {form.useTrueSolarTime && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="input" type="number" min="0" max="23" placeholder="时" value={form.birthHour} onChange={(e) => update('birthHour', e.target.value)} />
                <input className="input" type="number" min="0" max="59" placeholder="分" value={form.birthMinute} onChange={(e) => update('birthMinute', e.target.value)} />
              </div>
            )}
          </Field>

          {/* Birth place — PII */}
          <Field label="出生地（可选，仅城市级）" hint="填写后将由服务端加密存储，前端不保存明文。">
            <input
              className="input"
              placeholder="如：上海"
              value={form.birthPlace}
              onChange={(e) => update('birthPlace', e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>取消</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              开始排盘
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[--color-ink]">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-[--color-mist-400]">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function Radio({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? 'border-[--color-ink] bg-[--color-mist-50]' : 'border-[--color-ink]/15'}`}>
      <input type="radio" checked={checked} onChange={onChange} className="hidden" />
      {children}
    </label>
  )
}
