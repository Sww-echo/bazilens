import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FileText, BookOpen, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl px-6 pb-12 pt-10">
      {/* Hero */}
      <section className="text-center">
        <h1 className="serif text-4xl font-semibold leading-tight tracking-tight">{t('landing.wordmark')}</h1>
        <p className="serif mt-1 text-2xl text-[--color-ink]">{t('landing.subtitle')}</p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[--color-mist-500]">
          {t('landing.blurb')}
        </p>
        <Link
          to="/chart/new"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[--color-vermilion] px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-[--color-vermilion-soft]"
        >
          {t('landing.ctaTry')} <ArrowRight size={16} />
        </Link>
      </section>

      {/* Ink illustration with pillar cards */}
      <section className="mt-10 overflow-hidden rounded-xl bg-gradient-to-br from-[--color-mist-100] via-white to-[--color-mist-200]/60 p-6">
        <div className="relative h-44">
          <InkBackdrop />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { tg: '甲', dz: '子' },
                { tg: '丙', dz: '寅' },
                { tg: '戊', dz: '辰' },
                { tg: '庚', dz: '午' },
              ].map((p) => (
                <div
                  key={p.tg}
                  className="flex w-12 flex-col items-center rounded-sm border border-[--color-ink]/15 bg-white/85 px-1 py-2 text-center shadow-sm backdrop-blur"
                >
                  <span className="glyph text-base leading-none">{p.tg}</span>
                  <span className="glyph mt-1 text-base leading-none text-[--color-mist-500]">{p.dz}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modern Study */}
      <section className="mt-10">
        <h2 className="serif text-center text-2xl">{t('landing.modernStudy')}</h2>
        <div className="mx-auto mt-2 h-px w-12 bg-[--color-mist-300]" />

        <div className="mt-6 space-y-4">
          <FeatureCard
            icon={<BookOpen size={18} />}
            title={t('landing.feat1Title')}
            body={t('landing.feat1Body')}
          />
          <FeatureCard
            icon={<Sparkles size={18} />}
            title={t('landing.feat2Title')}
            body={t('landing.feat2Body')}
          />
          <FeatureCard
            icon={<FileText size={18} />}
            title={t('landing.feat3Title')}
            body={t('landing.feat3Body')}
          />
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-xl border border-[--color-ink]/8 bg-white/60 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[--color-jade]/15 text-[--color-jade]">
        {icon}
      </div>
      <h3 className="serif mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[--color-mist-500]">{body}</p>
    </article>
  )
}

function InkBackdrop() {
  return (
    <svg
      viewBox="0 0 360 180"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="inkA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A2332" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#1A2332" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="inkB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1A2332" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1A2332" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }).map((_, i) => (
        <path
          key={i}
          d={`M -20 ${40 + i * 14} C 80 ${20 + i * 14}, 200 ${130 - i * 6}, 380 ${60 + i * 8}`}
          stroke={i % 3 === 0 ? 'url(#inkA)' : 'url(#inkB)'}
          strokeWidth={i % 2 === 0 ? 1.4 : 0.9}
          fill="none"
          opacity={0.55 - i * 0.04}
        />
      ))}
    </svg>
  )
}
