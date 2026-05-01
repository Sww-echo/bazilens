import { useTranslation } from 'react-i18next'

export function Disclaimer({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation()
  const text = t(
    'disclaimer.footer',
    '本解读基于传统命理研究，仅供文化参考与个人探索，不构成医疗、法律、财务、投资或心理咨询建议。',
  )
  if (inline) {
    return <p className="text-xs italic text-[--color-mist-400]">{text}</p>
  }
  return (
    <div className="mt-8 rounded-lg border border-[--color-ink]/10 bg-[--color-mist-50] p-4 text-xs text-[--color-mist-500]">
      {text}
    </div>
  )
}
