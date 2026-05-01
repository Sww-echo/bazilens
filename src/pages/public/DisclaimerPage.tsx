import { Disclaimer } from '@/components/Disclaimer'

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-8">
      <h1 className="serif text-4xl font-semibold tracking-tight">Disclaimer</h1>
      <p className="mt-3 text-sm text-[--color-mist-500]">
        Important notice on the educational and cultural nature of this tool.
      </p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-[--color-ink]">
        <Disclaimer />

        <p>
          BaziLens is a traditional Chinese astrology study and reference tool offered for educational
          and entertainment purposes only. The interpretations produced by our engines and AI models
          are not, and must not be treated as, a substitute for professional medical, legal,
          financial, investment, or psychological advice.
        </p>
        <p>
          AI-generated readings can contain errors and reflect statistical patterns rather than
          factual claims about the future. We surface model fallback signals and quality scores so
          you can judge each output independently.
        </p>
        <p>
          For professional guidance on health, finance, or relationships, always consult a licensed
          practitioner in the relevant field.
        </p>
      </div>
    </div>
  )
}
