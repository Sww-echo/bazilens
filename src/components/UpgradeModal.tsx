import { X, Plus, Sparkles, Telescope, Bolt } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
}

const PERKS = [
  {
    icon: Telescope,
    title: 'Unlimited Bazi Grid Generations',
    sub: 'vs. 10 per month on current plan',
  },
  {
    icon: Sparkles,
    title: 'Advanced Pillar Interrelationships',
    sub: 'Unlock hidden stems and clash analysis',
  },
  {
    icon: Bolt,
    title: 'Priority Computational Insights',
    sub: 'Faster results during peak astrological alignments',
  },
]

export function UpgradeModal({ open, onClose, onUpgrade }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--color-ink]/50 px-5 py-8">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between p-5 pb-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[--color-ink] text-white">
            <Plus size={18} />
          </span>
          <button
            onClick={onClose}
            aria-label="close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[--color-mist-500] hover:bg-[--color-mist-100]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <h2 className="serif text-2xl font-semibold leading-tight">
            One More Reading? Unlock More
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[--color-mist-500]">
            You've reached your monthly Bazi analysis quota. Upgrade your scholarly toolkit to continue
            uncovering deep insights without interruption.
          </p>

          <ArmillaryArt />

          <span className="mt-5 inline-flex rounded bg-[--color-jade]/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[--color-jade]">
            Recommended
          </span>
          <h3 className="serif mt-2 text-2xl font-semibold">Scholar Tier</h3>
          <p className="mt-1 text-sm text-[--color-mist-500]">For dedicated practitioners.</p>

          <ul className="mt-4 divide-y divide-[--color-ink]/8">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-3 py-3">
                <p.icon size={20} strokeWidth={1.75} className="mt-0.5 flex-none text-[--color-ink]" />
                <div>
                  <p className="text-sm font-semibold text-[--color-ink]">{p.title}</p>
                  <p className="mt-0.5 text-xs text-[--color-mist-500]">{p.sub}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={onUpgrade}
            className="mt-5 w-full rounded-md bg-[--color-vermilion] px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-[--color-vermilion-soft]"
          >
            Upgrade Now
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-md border border-[--color-ink]/15 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wider text-[--color-ink] hover:bg-[--color-mist-50]"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

function ArmillaryArt() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl bg-gradient-to-br from-[--color-mist-200] via-[--color-paper-2] to-[--color-mist-300]/40 px-4 py-5">
      <svg viewBox="0 0 200 110" className="mx-auto h-28 w-full" aria-hidden="true">
        <ellipse cx="100" cy="62" rx="46" ry="14" fill="none" stroke="#C4A661" strokeWidth="1.5" />
        <ellipse cx="100" cy="62" rx="40" ry="38" fill="none" stroke="#C4A661" strokeWidth="1.5" />
        <ellipse cx="100" cy="62" rx="14" ry="40" fill="none" stroke="#C4A661" strokeWidth="1.5" />
        <line x1="100" y1="22" x2="100" y2="100" stroke="#1A2332" strokeWidth="1.4" />
        <circle cx="100" cy="62" r="6" fill="#C4A661" />
        <path d="M 92 100 L 108 100 L 104 108 L 96 108 Z" fill="#1A2332" />
      </svg>
    </div>
  )
}
