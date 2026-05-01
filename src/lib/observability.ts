// Observability bootstrap: Sentry (errors) + PostHog (analytics).
// Init is gated by user consent (consentStore). Re-evaluate when consent changes.
//
// Required env vars (all optional — missing values just disable that provider):
//   VITE_SENTRY_DSN
//   VITE_POSTHOG_KEY
//   VITE_POSTHOG_HOST   (defaults to https://app.posthog.com)

import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

import type { Consent } from '@/stores/consentStore'

let sentryInitialized = false
let posthogInitialized = false

export function configureObservability(consent: Consent) {
  configureSentry(consent.errors)
  configurePostHog(consent.analytics)
}

function configureSentry(enabled: boolean) {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || !enabled) {
    if (sentryInitialized) {
      // No "deinit" — close client to stop further reporting.
      void Sentry.close(0)
      sentryInitialized = false
    }
    return
  }
  if (sentryInitialized) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    beforeSend(event) {
      // PII guard: scrub email/URL params best-effort.
      if (event.user?.email) delete event.user.email
      return event
    },
  })
  sentryInitialized = true
}

function configurePostHog(enabled: boolean) {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || !enabled) {
    if (posthogInitialized) {
      posthog.opt_out_capturing()
      posthogInitialized = false
    }
    return
  }
  if (posthogInitialized) {
    posthog.opt_in_capturing()
    return
  }

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
    autocapture: false,
    capture_pageview: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
  })
  posthogInitialized = true
}
