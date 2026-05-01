import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-[--color-ink]/10 bg-[--color-paper]">
      <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-[--color-mist-500]">
        <p className="italic">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/privacy" className="hover:text-[--color-ink]">{t('footer.privacy')}</Link>
          <Link to="/terms" className="hover:text-[--color-ink]">{t('footer.terms')}</Link>
          <Link to="/disclaimer" className="hover:text-[--color-ink]">{t('footer.disclaimer')}</Link>
        </p>
      </div>
    </footer>
  )
}
