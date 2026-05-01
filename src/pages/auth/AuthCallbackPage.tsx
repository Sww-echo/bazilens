import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { supabase } from '@/api/client'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/charts', { replace: true })
      } else {
        navigate('/auth/sign-in?error=no_session', { replace: true })
      }
    })()
  }, [navigate])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 sm:px-6">
      <Loader2 size={32} className="animate-spin text-[--color-mist-400]" />
      <p className="mt-4 text-sm text-[--color-mist-500]">正在完成登录…</p>
    </div>
  )
}
