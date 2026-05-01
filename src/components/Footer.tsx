import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-[--color-ink]/10 bg-[--color-paper]">
      <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-[--color-mist-500]">
        <p className="italic">
          © {new Date().getFullYear()} BaziLens. Scholarly insights for the modern era.
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/privacy" className="hover:text-[--color-ink]">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[--color-ink]">Terms of Service</Link>
          <Link to="/disclaimer" className="hover:text-[--color-ink]">Disclaimer</Link>
        </p>
      </div>
    </footer>
  )
}
