import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, Search, Star, ChevronDown } from 'lucide-react'

import { listMyTickets, type TicketRow, type TicketStatus } from '@/api/tickets'

const FALLBACK: Array<TicketRow & { user_name: string; user_initials: string; relative: string; pinned?: boolean; categoryLabel: string }> = [
  {
    id: 'a',
    category: 'other',
    priority: 5,
    status: 'open',
    subject: 'Discrepancy in Hidden Stems...',
    initial_body: '',
    replies: [],
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    first_reply_at: null,
    closed_at: null,
    user_name: 'John Doe',
    user_initials: 'JD',
    relative: '2 hours ago',
    pinned: true,
    categoryLabel: 'Chart Interpretation',
  },
  {
    id: 'b',
    category: 'pdf_failed',
    priority: 4,
    status: 'in_progress',
    subject: 'PDF Export failing on Safari browser',
    initial_body: '',
    replies: [],
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    first_reply_at: null,
    closed_at: null,
    user_name: 'Alice Lin',
    user_initials: 'AL',
    relative: '5 hours ago',
    categoryLabel: 'Technical Issue',
  },
  {
    id: 'c',
    category: 'payment_issue',
    priority: 3,
    status: 'open',
    subject: 'Upgrade to Scholarly Tier...',
    initial_body: '',
    replies: [],
    created_at: new Date(Date.now() - 86400_000).toISOString(),
    first_reply_at: null,
    closed_at: null,
    user_name: 'Michael Chen',
    user_initials: 'MC',
    relative: 'Yesterday',
    categoryLabel: 'Billing',
  },
  {
    id: 'd',
    category: 'reading_inaccurate',
    priority: 2,
    status: 'closed',
    subject: 'Explanation needed for Day...',
    initial_body: '',
    replies: [],
    created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    first_reply_at: null,
    closed_at: new Date().toISOString(),
    user_name: 'Sarah Wong',
    user_initials: 'SW',
    relative: '2 days ago',
    categoryLabel: 'Chart Interpretation',
  },
]

export default function AdminTicketsPage() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<typeof FALLBACK>(FALLBACK)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const rows = await listMyTickets(30)
        if (rows && rows.length > 0) {
          setTickets(
            rows.map((r) => ({
              ...r,
              user_name: 'User',
              user_initials: 'U',
              relative: relativeTime(r.created_at),
              categoryLabel: humanizeCategory(r.category),
            })),
          )
        }
      } catch {
        // keep fallback
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (priorityFilter !== 'all' && String(t.priority) !== priorityFilter) return false
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.user_name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="bg-[#EEF1F6]">
      <div className="mx-auto max-w-3xl px-5 pb-8 pt-2">
        {/* Inline header overlay (NavBar already shows BaziLens; show menu) */}
        <div className="flex items-center justify-between pb-2">
          <button aria-label="menu" className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-jade] hover:bg-white">
            <Menu size={20} />
          </button>
          <span className="w-9" />
        </div>

        <h1 className="serif text-4xl font-semibold tracking-tight">{t('tickets.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[--color-mist-500]">
          {t('tickets.subtitle')}
        </p>

        {/* Search */}
        <div className="mt-7">
          <label className="block text-xs font-semibold text-[--color-ink]">{t('tickets.search')}</label>
          <div className="relative mt-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-mist-400]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tickets.searchPlaceholder')}
              className="w-full rounded-md border border-[--color-ink]/12 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-[--color-mist-400] focus:border-[--color-ink]/40 focus:outline-none focus:ring-2 focus:ring-[--color-ink]/10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <FilterSelect
            label={t('tickets.status')}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as 'all' | TicketStatus)}
            options={[
              { value: 'all', label: t('tickets.allStatuses') },
              { value: 'open', label: t('tickets.open') },
              { value: 'in_progress', label: t('tickets.inProgress') },
              { value: 'replied', label: t('tickets.replied') },
              { value: 'closed', label: t('tickets.resolved') },
            ]}
          />
          <FilterSelect
            label={t('tickets.category')}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: t('tickets.allCategories') },
              { value: 'reading_inaccurate', label: t('tickets.categoryChart') },
              { value: 'pdf_failed', label: t('tickets.categoryTechnical') },
              { value: 'payment_issue', label: t('tickets.categoryBilling') },
            ]}
          />
        </div>
        <div className="mt-3">
          <FilterSelect
            label={t('tickets.priority')}
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'all', label: t('tickets.allPriorities') },
              { value: '5', label: 'P5 — Urgent' },
              { value: '4', label: 'P4 — High' },
              { value: '3', label: 'P3 — Medium' },
              { value: '2', label: 'P2 — Low' },
            ]}
          />
        </div>

        {/* Tickets */}
        <div className="mt-7 space-y-4">
          {loading && <p className="text-sm text-[--color-mist-400]">加载中…</p>}
          {filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[--color-ink]">{label}</label>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-[--color-ink]/12 bg-white py-2.5 pl-3 pr-9 text-sm text-[--color-ink] focus:border-[--color-ink]/40 focus:outline-none focus:ring-2 focus:ring-[--color-ink]/10"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[--color-mist-400]" />
      </div>
    </div>
  )
}

function TicketCard({ ticket }: { ticket: typeof FALLBACK[number] }) {
  const isResolved = ticket.status === 'closed'
  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-white p-5 ${
        ticket.pinned ? 'border-[--color-vermilion]/30 shadow-sm' : 'border-[--color-ink]/10'
      }`}
    >
      {ticket.pinned && (
        <span className="absolute inset-y-0 left-0 w-1.5 bg-[--color-vermilion]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star
            size={18}
            className={ticket.pinned ? 'fill-[--color-vermilion] text-[--color-vermilion]' : 'text-[--color-mist-300]'}
          />
          <span
            className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${
              isResolved
                ? 'bg-[--color-mist-100] text-[--color-mist-500]'
                : 'bg-[--color-jade]/15 text-[--color-jade]'
            }`}
          >
            {ticket.categoryLabel}
          </span>
        </div>
        <StatusChip status={ticket.status} />
      </div>

      <h3 className={`serif mt-3 text-xl font-semibold leading-tight ${isResolved ? 'text-[--color-mist-400]' : 'text-[--color-ink]'}`}>
        {ticket.subject}
      </h3>

      <div className="mt-3 h-px bg-[--color-ink]/8" />

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[--color-mist-200]/70 text-[10px] font-semibold uppercase text-[--color-ink]">
            {ticket.user_initials}
          </span>
          <span className={isResolved ? 'text-[--color-mist-400]' : 'text-[--color-ink]'}>{ticket.user_name}</span>
        </div>
        <span className="text-xs text-[--color-mist-500]">{ticket.relative}</span>
      </div>
    </article>
  )
}

function StatusChip({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; cls: string }> = {
    open: { label: 'Open', cls: 'bg-[--color-mist-100] text-[--color-ink]' },
    in_progress: { label: 'In Progress', cls: 'bg-[--color-ink] text-white' },
    replied: { label: 'Replied', cls: 'bg-[--color-jade]/15 text-[--color-jade]' },
    closed: { label: 'Resolved', cls: 'bg-[--color-mist-100] text-[--color-mist-500]' },
    escalated: { label: 'Escalated', cls: 'bg-[--color-vermilion]/15 text-[--color-vermilion]' },
  }
  const { label, cls } = map[status]
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>
}

function relativeTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 3600_000) return `${Math.round(d / 60_000)} minutes ago`
  if (d < 86400_000) return `${Math.round(d / 3600_000)} hours ago`
  if (d < 2 * 86400_000) return 'Yesterday'
  return `${Math.round(d / 86400_000)} days ago`
}

function humanizeCategory(c: string) {
  switch (c) {
    case 'reading_inaccurate': return 'Chart Interpretation'
    case 'unhappy_result': return 'Reading Feedback'
    case 'pdf_failed': return 'Technical Issue'
    case 'payment_issue': return 'Billing'
    case 'refund_request': return 'Refund'
    default: return 'Other'
  }
}
