import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Loader2 } from 'lucide-react'

type ServiceStatus = 'operational' | 'degraded' | 'down'

type Service = {
  name: string
  status: ServiceStatus
  detail: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
}

const SERVICES: Service[] = [
  { name: 'API', status: 'operational', detail: 'p95 142 ms', icon: Activity },
  { name: 'Database', status: 'operational', detail: 'Supabase · primary', icon: Database },
  { name: 'AI Models', status: 'degraded', detail: 'GPT-4.1 elevated latency', icon: Cpu },
  { name: 'PDF Worker', status: 'operational', detail: 'Queue depth 0', icon: AlertTriangle },
]

export default function AdminStatusPage() {
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250)
    const i = setInterval(() => setNow(new Date()), 30_000)
    return () => {
      clearTimeout(t)
      clearInterval(i)
    }
  }, [])

  return (
    <div className="bg-[#EEF1F6]">
      <div className="mx-auto max-w-3xl px-5 pb-8 pt-6">
        <h1 className="serif text-4xl font-semibold tracking-tight">System Status</h1>
        <p className="mt-2 text-sm text-[--color-mist-500]">
          Live operational health of BaziLens services.
        </p>

        <div className="mt-6 rounded-xl border border-[--color-jade]/30 bg-[--color-jade]/10 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-[--color-jade]" />
            <div>
              <p className="serif text-lg font-semibold">All systems mostly operational</p>
              <p className="text-xs text-[--color-mist-500]">
                Last checked {now.toLocaleTimeString('en-US')}
              </p>
            </div>
          </div>
        </div>

        <h2 className="serif mt-8 text-2xl font-semibold">Services</h2>

        {loading ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[--color-mist-400]">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {SERVICES.map((s) => (
              <li
                key={s.name}
                className="flex items-center gap-4 rounded-xl border border-[--color-ink]/10 bg-white p-4"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[--color-mist-100] text-[--color-ink]">
                  <s.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[--color-ink]">{s.name}</p>
                  <p className="text-xs text-[--color-mist-500]">{s.detail}</p>
                </div>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, { label: string; cls: string }> = {
    operational: { label: 'Operational', cls: 'bg-[--color-jade]/15 text-[--color-jade]' },
    degraded: { label: 'Degraded', cls: 'bg-[--color-bronze]/15 text-[--color-bronze]' },
    down: { label: 'Down', cls: 'bg-[--color-vermilion]/15 text-[--color-vermilion]' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>
}
