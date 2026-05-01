import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ChromeIcon, Apple, Loader2 } from 'lucide-react'

import { signInWithMagicLink, signInWithGoogle, signInWithApple } from '@/api/auth'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [age16, setAge16] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !agreed || !age16) {
      setError('请填写邮箱并勾选两项确认。')
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
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="card">
        <h1 className="serif text-2xl">登录 BaziLens</h1>
        <p className="mt-1 text-sm text-[--color-mist-500]">用邮箱链接登录，无需密码。</p>

        {sent ? (
          <div className="mt-6 rounded-lg bg-[--color-jade]/10 p-4 text-sm text-[--color-jade]">
            登录邮件已发送至 <span className="font-medium">{email}</span>。请在 10 分钟内查收并点击链接完成登录。
          </div>
        ) : (
          <form onSubmit={submitMagic} className="mt-6 space-y-4">
            <div>
              <label className="text-sm">邮箱</label>
              <input
                type="email"
                className="input mt-1"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-[--color-mist-500]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              我已阅读并同意 <Link to="/terms" className="underline">服务条款</Link> 与{' '}
              <Link to="/privacy" className="underline">隐私政策</Link>。
            </label>
            <label className="flex items-start gap-2 text-xs text-[--color-mist-500]">
              <input
                type="checkbox"
                checked={age16}
                onChange={(e) => setAge16(e.target.checked)}
                className="mt-0.5"
              />
              我已年满 16 岁。
            </label>

            {error && <p className="text-sm text-[--color-vermilion]">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              发送登录邮件
            </button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3 text-xs text-[--color-mist-400]">
          <span className="flex-1 border-t border-[--color-ink]/10" />
          或
          <span className="flex-1 border-t border-[--color-ink]/10" />
        </div>

        <div className="space-y-2">
          <button className="btn-secondary w-full" onClick={() => void signInWithGoogle()}>
            <ChromeIcon size={16} /> 使用 Google 登录
          </button>
          <button className="btn-secondary w-full" onClick={() => void signInWithApple()}>
            <Apple size={16} /> 使用 Apple 登录
          </button>
        </div>
      </div>
    </div>
  )
}
