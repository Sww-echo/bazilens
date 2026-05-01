import { Link, NavLink } from 'react-router-dom'
import { Menu, X, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

const navItems = [
  { to: '/charts', labelKey: 'nav.charts' },
  { to: '/readings', labelKey: 'nav.readings' },
  { to: '/reports', labelKey: 'nav.reports' },
] as const

export function NavBar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const tier = useSubscriptionStore((s) => s.tier)

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-ink]/10 bg-[--color-paper]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="serif text-xl tracking-tight">BaziLens</span>
          <span className="hidden text-xs text-[--color-mist-400] sm:inline">命理研究工具</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-[--color-mist-100] text-[--color-ink]' : ''}`
              }
            >
              {t(item.labelKey, defaultLabel(item.labelKey))}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <TierBadge tier={tier} />
              <Link to="/account" className="btn-ghost" aria-label="account">
                <User size={18} />
              </Link>
            </>
          ) : (
            <Link to="/auth/sign-in" className="btn-primary">
              {t('auth.signIn', '登录')}
            </Link>
          )}
        </div>

        <button
          className="btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[--color-ink]/10 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm ${
                    isActive ? 'bg-[--color-mist-100]' : 'hover:bg-[--color-mist-100]'
                  }`
                }
              >
                {t(item.labelKey, defaultLabel(item.labelKey))}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-[--color-ink]/10 pt-2">
              {user ? (
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-[--color-mist-100]"
                >
                  {t('nav.account', '账户')}
                </Link>
              ) : (
                <Link
                  to="/auth/sign-in"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-[--color-vermilion]"
                >
                  {t('auth.signIn', '登录')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function TierBadge({ tier }: { tier: 'free' | 'plus' | 'pro' }) {
  if (tier === 'pro') return <span className="badge-pro">Pro</span>
  if (tier === 'plus') return <span className="badge-plus">Plus</span>
  return <span className="badge-free">Free</span>
}

function defaultLabel(key: string): string {
  switch (key) {
    case 'nav.charts': return '我的命盘'
    case 'nav.readings': return '解读历史'
    case 'nav.reports': return '详批报告'
    default: return key
  }
}
