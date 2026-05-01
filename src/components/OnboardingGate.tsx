import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'
import { hasCompletedOnboarding } from '@/pages/onboarding/OnboardingPage'

const FRESH_USER_WINDOW_MS = 5 * 60 * 1000

const SAFE_FOR_REDIRECT = [/^\/charts$/, /^\/readings$/, /^\/reports$/, /^\/account$/]

/**
 * Sends fresh authed users (created within last 5 min) with no onboarding
 * flag to /onboarding once. Idempotent — calling twice is a no-op because
 * onboarding writes the flag to localStorage. The redirect only fires from
 * "safe" landing pages so we never interrupt mid-flow work.
 */
export function OnboardingGate() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    if (hasCompletedOnboarding()) return
    if (!SAFE_FOR_REDIRECT.some((re) => re.test(location.pathname))) return

    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
    const isFresh = Date.now() - createdAt < FRESH_USER_WINDOW_MS
    if (!isFresh) return

    navigate('/onboarding', { replace: true })
  }, [user, location.pathname, navigate])

  return null
}
