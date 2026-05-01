import { Outlet, useLocation } from 'react-router-dom'

import { NavBar } from './NavBar'
import { Footer } from './Footer'
import { BottomTabs } from './BottomTabs'
import { CookieConsent } from './CookieConsent'
import { OnboardingGate } from './OnboardingGate'

const ROUTES_WITHOUT_NAV = [/^\/auth\//, /^\/chart\/new$/, /^\/chart\/[^/]+$/, /^\/reading\/new$/, /^\/onboarding$/]
const ROUTES_WITH_TABS = [/^\/charts$/, /^\/readings$/, /^\/reading\/[^/]+$/, /^\/reports$/, /^\/report\/[^/]+$/, /^\/account$/, /^\/admin/]
const ROUTES_WITH_FOOTER = [/^\/$/, /^\/privacy$/, /^\/terms$/, /^\/disclaimer$/, /^\/auth\//, /^\/report\/[^/]+$/, /^\/upgrade$/]

function matches(pathname: string, list: RegExp[]) {
  return list.some((re) => re.test(pathname))
}

export function Layout() {
  const { pathname } = useLocation()
  const hideNav = matches(pathname, ROUTES_WITHOUT_NAV)
  const showTabs = matches(pathname, ROUTES_WITH_TABS)
  const showFooter = matches(pathname, ROUTES_WITH_FOOTER)

  return (
    <div className="flex min-h-screen flex-col bg-[--color-paper]">
      <OnboardingGate />
      {!hideNav && <NavBar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {showFooter && <Footer />}
      {showTabs && <BottomTabs />}
      <CookieConsent />
    </div>
  )
}
