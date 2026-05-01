import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useConsentStore } from '@/stores/consentStore'

export function CookieConsent() {
  const { consent, hydrated, save } = useConsentStore()
  const [customOpen, setCustomOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [errors, setErrors] = useState(false)

  // Hide once user agreed (agreedAt set), only show after hydration
  if (!hydrated) return null
  if (consent.agreedAt) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[--color-ink]/15 bg-white shadow-lg">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <p className="text-sm text-[--color-ink]">
          我们使用 Cookie 提供服务、分析使用情况并改进体验。{' '}
          <Link to="/privacy" className="underline hover:text-[--color-vermilion]">
            隐私政策
          </Link>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="btn-primary"
            onClick={() => save({ analytics: true, errors: true, marketing: false })}
          >
            全部接受
          </button>
          <button
            className="btn-secondary"
            onClick={() => save({ analytics: false, errors: false, marketing: false })}
          >
            仅必要
          </button>
          <button className="btn-ghost" onClick={() => setCustomOpen((v) => !v)}>
            {customOpen ? '收起' : '自定义'}
          </button>
        </div>

        {customOpen && (
          <div className="mt-3 space-y-2 border-t border-[--color-ink]/10 pt-3 text-sm">
            <label className="flex items-center gap-2 text-[--color-mist-500]">
              <input type="checkbox" checked disabled />
              必要 Cookie（登录会话） — 必需
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              性能分析（PostHog）
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={errors}
                onChange={(e) => setErrors(e.target.checked)}
              />
              错误监控（Sentry）
            </label>
            <button
              className="btn-secondary mt-2"
              onClick={() => save({ analytics, errors, marketing: false })}
            >
              保存我的选择
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
