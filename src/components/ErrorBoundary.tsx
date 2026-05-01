import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof Sentry?.captureException === 'function') {
      Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
    } else {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return <Fallback error={this.state.error} onRetry={this.reset} />
    }
    return this.props.children
  }
}

function Fallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-paper] px-6 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[--color-vermilion]/15 text-[--color-vermilion]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="serif mt-5 text-2xl font-semibold text-[--color-ink]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[--color-mist-500]">
          An unexpected error occurred while rendering this page. The team has been notified.
        </p>
        {import.meta.env.DEV && (
          <pre className="mx-auto mt-4 max-w-full overflow-auto rounded-lg bg-[--color-mist-100] p-3 text-left text-xs text-[--color-mist-600]">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="rounded-md bg-[--color-vermilion] px-5 py-2.5 text-sm font-medium text-white hover:bg-[--color-vermilion-soft]"
          >
            Reload Page
          </button>
          <a
            href="/"
            className="rounded-md border border-[--color-ink]/15 bg-white px-5 py-2.5 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
