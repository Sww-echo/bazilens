import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, BrainCircuit, FileText, Settings, LayoutGrid, Headphones, User } from 'lucide-react'

type Tab = {
  to: string
  labelKey: string
  defaultLabel: string
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>
}

const APP_TABS: Tab[] = [
  { to: '/charts', labelKey: 'tab.charts', defaultLabel: 'Charts', icon: Sparkles },
  { to: '/readings', labelKey: 'tab.aiReading', defaultLabel: 'AI Reading', icon: BrainCircuit },
  { to: '/reports', labelKey: 'tab.reports', defaultLabel: 'Reports', icon: FileText },
  { to: '/account', labelKey: 'tab.settings', defaultLabel: 'Settings', icon: Settings },
]

const ADMIN_TABS: Tab[] = [
  { to: '/admin/status', labelKey: 'tab.status', defaultLabel: 'Status', icon: LayoutGrid },
  { to: '/admin/tickets', labelKey: 'tab.tickets', defaultLabel: 'Tickets', icon: Headphones },
  { to: '/account', labelKey: 'tab.profile', defaultLabel: 'Profile', icon: User },
]

export function BottomTabs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const tabs = isAdmin ? ADMIN_TABS : APP_TABS

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-[--color-ink]/10 bg-[--color-paper]/95 backdrop-blur"
      aria-label="primary"
    >
      <ul className="mx-auto flex h-16 max-w-3xl items-stretch">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/admin/status'}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-[--color-vermilion]'
                    : 'text-[--color-mist-400] hover:text-[--color-ink]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                  <span>{t(tab.labelKey, tab.defaultLabel)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
