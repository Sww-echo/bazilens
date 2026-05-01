import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-24 border-t border-[--color-ink]/10 bg-[--color-paper]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="serif text-lg">BaziLens</div>
            <p className="mt-2 max-w-sm text-sm text-[--color-mist-500]">
              传统中国命理研究工具。八字、紫微、占卜排盘 + AI 深度解读。
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[--color-mist-400]">
              产品
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/" className="hover:text-[--color-vermilion]">{t('nav.home', '首页')}</Link></li>
              <li><Link to="/upgrade" className="hover:text-[--color-vermilion]">订阅与升级</Link></li>
              <li><Link to="/chart/new" className="hover:text-[--color-vermilion]">创建命盘</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[--color-mist-400]">
              法律与支持
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-[--color-vermilion]">隐私政策</Link></li>
              <li><Link to="/terms" className="hover:text-[--color-vermilion]">服务条款</Link></li>
              <li><Link to="/refund" className="hover:text-[--color-vermilion]">退款政策</Link></li>
              <li>
                <a href="mailto:support@bazilens.app" className="hover:text-[--color-vermilion]">
                  support@bazilens.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[--color-ink]/10 pt-6 text-xs text-[--color-mist-400]">
          <p>
            本工具基于传统命理研究，仅供文化参考与个人探索，不构成医疗、法律、财务、投资或心理咨询建议。
          </p>
          <p className="mt-1 italic">
            This app is a traditional Chinese astrology study and reference tool for educational and entertainment purposes only.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} BaziLens. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
