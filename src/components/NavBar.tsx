import { Link, useLocation } from 'react-router-dom'
import { BookOpen, User } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'

/**
 * Top app bar: small book icon + "BaziLens" wordmark + avatar/profile button.
 * Matches mobile mockups (Landing, Account, Report Status, Admin, AI Reading).
 */
export function NavBar() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-ink]/10 bg-[--color-paper]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" aria-label="home" className="text-[--color-ink]/70 hover:text-[--color-ink]">
          <BookOpen size={20} strokeWidth={1.75} />
        </Link>
        <Link to="/" className="serif text-lg font-semibold tracking-tight">
          BaziLens
        </Link>
        <div className="flex h-9 w-9 items-center justify-center">
          {user ? (
            <Link
              to={isAdmin ? '/admin/profile' : '/account'}
              aria-label="account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[--color-mist-200]/60 text-[--color-ink]/70 hover:bg-[--color-mist-200]"
            >
              <User size={18} />
            </Link>
          ) : (
            <Link
              to="/auth/sign-in"
              aria-label="sign in"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[--color-ink]/70 hover:bg-[--color-mist-100]"
            >
              <User size={18} />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
