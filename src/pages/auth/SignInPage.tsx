import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Smartphone, Loader2 } from 'lucide-react'

import { signInWithMagicLink, signInWithGoogle, signInWithApple } from '@/api/auth'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [age16, setAge16] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formInvalid = !email || !agreed || !age16

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (formInvalid) {
      setError('Please enter your email and confirm both checkboxes.')
      return
    }
    setBusy(true)
    try {
      const { error } = await signInWithMagicLink(email)
      if (error) throw error
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EEF1F6]">
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-[--color-ink]/10 bg-white p-8 shadow-sm">
            <div className="flex justify-center">
              <DotGlyph />
            </div>
            <h1 className="serif mt-6 text-center text-3xl font-semibold leading-tight">
              Sign in to<br />BaziLens
            </h1>
            <p className="mt-3 text-center text-sm text-[--color-mist-500]">
              Access your scholarly analytical tools.
            </p>

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-[--color-ink]/15 bg-white px-4 py-3 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
              >
                <Mail size={18} strokeWidth={1.75} />
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => void signInWithApple()}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-[--color-ink]/15 bg-white px-4 py-3 text-sm font-medium text-[--color-ink] hover:bg-[--color-mist-50]"
              >
                <Smartphone size={18} strokeWidth={1.75} />
                Continue with Apple
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[--color-mist-400]">
              <span className="flex-1 border-t border-[--color-ink]/10" />
              <span>Or Magic Link</span>
              <span className="flex-1 border-t border-[--color-ink]/10" />
            </div>

            {sent ? (
              <div className="rounded-lg bg-[--color-jade]/10 p-4 text-sm text-[--color-jade]">
                Magic link sent to <span className="font-medium">{email}</span>. Check your inbox
                within 10 minutes.
              </div>
            ) : (
              <form onSubmit={submitMagic} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[--color-ink]">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="scholar@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                    className="mt-2 w-full border-0 border-b border-[--color-ink]/15 bg-transparent px-0 py-2 text-base text-[--color-ink] placeholder:text-[--color-mist-300] focus:border-[--color-ink] focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="space-y-3 text-sm text-[--color-ink]">
                  <Check
                    checked={agreed}
                    onChange={setAgreed}
                    label={
                      <>
                        I agree to the{' '}
                        <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
                        <Link to="/privacy" className="underline">Privacy Policy</Link>.
                      </>
                    }
                  />
                  <Check
                    checked={age16}
                    onChange={setAge16}
                    label="I confirm I am 16 years of age or older."
                  />
                </div>

                {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}

                <button
                  type="submit"
                  disabled={busy || formInvalid}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[--color-ink] px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[--color-ink-soft] disabled:cursor-not-allowed disabled:bg-[--color-ink]/40"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  Send Magic Link
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[--color-mist-500]">
            Need help?{' '}
            <a href="mailto:support@bazilens.app" className="font-semibold text-[--color-ink]">
              Contact Support
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border ${
          checked ? 'border-[--color-ink] bg-[--color-ink] text-white' : 'border-[--color-ink]/25 bg-white'
        }`}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6.5 5 9.5 10 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-snug">{label}</span>
    </label>
  )
}

function DotGlyph() {
  const dots: { x: number; y: number }[] = []
  const radius = 12
  for (let r = 0; r <= radius; r += 4) {
    const count = r === 0 ? 1 : Math.round((2 * Math.PI * r) / 4)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      dots.push({ x: 14 + Math.cos(angle) * r, y: 14 + Math.sin(angle) * r })
    }
  }
  return (
    <svg width="40" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="1.1" fill="#1A2332" />
      ))}
    </svg>
  )
}
