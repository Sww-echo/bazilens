import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuthStore } from '@/stores/authStore'
import { useConsentStore } from '@/stores/consentStore'
import { supabase } from '@/api/client'
import { configureObservability } from '@/lib/observability'

const LandingPage         = lazy(() => import('@/pages/public/LandingPage'))
const PrivacyPolicyPage   = lazy(() => import('@/pages/public/PrivacyPolicyPage'))
const TermsPage           = lazy(() => import('@/pages/public/TermsPage'))
const DisclaimerPage      = lazy(() => import('@/pages/public/DisclaimerPage'))
const SignInPage          = lazy(() => import('@/pages/auth/SignInPage'))
const AuthCallbackPage    = lazy(() => import('@/pages/auth/AuthCallbackPage'))
const ChartListPage       = lazy(() => import('@/pages/chart/ChartListPage'))
const ChartNewPage        = lazy(() => import('@/pages/chart/ChartNewPage'))
const ChartDetailPage     = lazy(() => import('@/pages/chart/ChartDetailPage'))
const ReadingNewPage      = lazy(() => import('@/pages/reading/ReadingNewPage'))
const ReadingListPage     = lazy(() => import('@/pages/reading/ReadingListPage'))
const ReportListPage      = lazy(() => import('@/pages/report/ReportListPage'))
const ReportDetailPage    = lazy(() => import('@/pages/report/ReportDetailPage'))
const AccountPage         = lazy(() => import('@/pages/account/AccountPage'))
const UpgradePage         = lazy(() => import('@/pages/upgrade/UpgradePage'))
const AdminTicketsPage    = lazy(() => import('@/pages/admin/TicketsPage'))
const AdminStatusPage     = lazy(() => import('@/pages/admin/StatusPage'))

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const restoreConsent = useConsentStore((s) => s.restore)
  const consent = useConsentStore((s) => s.consent)
  const consentHydrated = useConsentStore((s) => s.hydrated)

  useEffect(() => {
    restoreConsent()

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [restoreConsent, setUser])

  useEffect(() => {
    if (!consentHydrated) return
    configureObservability(consent)
  }, [consent, consentHydrated])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/disclaimer" element={<DisclaimerPage />} />
              <Route path="/auth/sign-in" element={<SignInPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/charts" element={<ChartListPage />} />
              <Route path="/chart/new" element={<ChartNewPage />} />
              <Route path="/chart/:id" element={<ChartDetailPage />} />
              <Route path="/reading/new" element={<ReadingNewPage />} />
              <Route path="/readings" element={<ReadingListPage />} />
              <Route path="/reports" element={<ReportListPage />} />
              <Route path="/report/:id" element={<ReportDetailPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/status" element={<AdminStatusPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-[--color-mist-400]">
      加载中…
    </div>
  )
}
