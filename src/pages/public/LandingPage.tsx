import { Link } from 'react-router-dom'
import { Sparkles, FileText, Shield, ArrowRight } from 'lucide-react'
import { Disclaimer } from '@/components/Disclaimer'

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[--color-ink]/10">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="badge-vermilion w-fit">Sprint 0 · Preview</span>
            <h1 className="mt-4 serif text-4xl leading-tight sm:text-5xl">
              读懂你的 <span className="text-[--color-vermilion]">八字</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-[--color-mist-500] sm:text-lg">
              基于经典命理（穷通宝鉴 700+ 规则）的 AI 深度解读。
              支持八字 / 紫微 / 占卜排盘，导出专业 PDF 详批。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/chart/new" className="btn-primary">
                免费试用 <ArrowRight size={16} />
              </Link>
              <Link to="/upgrade" className="btn-secondary">
                查看订阅
              </Link>
            </div>

            <p className="mt-4 text-xs text-[--color-mist-400]">
              无需信用卡 · 注册即送 3 次免费 AI 解读
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ChartPreview />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="serif text-center text-3xl">为什么选择 BaziLens</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Shield size={20} />}
            title="经典命理算法"
            body="八字穷通宝鉴 700+ 条精细规则，紫微全盘 + 大限流年完整推导。31 个核心引擎文件源自 mingyu。"
          />
          <FeatureCard
            icon={<Sparkles size={20} />}
            title="AI 深度解读"
            body="Pro 档 Claude Sonnet 4.6，Plus 档 GPT-4.1。三模型自动 fallback 保证可用。"
          />
          <FeatureCard
            icon={<FileText size={20} />}
            title="PDF 详批报告"
            body="$14.99 一生总论 7 章 5000-8000 字，专业排版可下载收藏。"
          />
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-[--color-ink]/10 bg-[--color-paper-2]/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="serif text-center text-3xl">订阅档位</h2>
          <p className="mt-3 text-center text-sm text-[--color-mist-500]">
            按月付 / 年付有 17% 折扣，所有档位均可单独购买详批 PDF
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <PriceCard tier="Free" price="$0" perks={['每月 3 次 DeepSeek 解读', '基础八字 + 紫微排盘']} />
            <PriceCard tier="Plus" price="$4.99/mo" perks={['每月 30 次 GPT-4.1 解读', '历史无限保存']} highlight />
            <PriceCard tier="Pro" price="$9.99/mo" perks={['每月 200 次 Claude 解读', '流年大运 + 合盘（Sprint 2）']} />
          </div>
          <div className="mt-6 text-center">
            <Link to="/upgrade" className="btn-secondary">查看完整对比</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Disclaimer />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[--color-vermilion]/10 text-[--color-vermilion]">
        {icon}
      </div>
      <h3 className="serif mt-4 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-[--color-mist-500]">{body}</p>
    </div>
  )
}

function PriceCard({ tier, price, perks, highlight }: { tier: string; price: string; perks: string[]; highlight?: boolean }) {
  return (
    <div className={`card relative ${highlight ? 'border-[--color-vermilion] shadow-md' : ''}`}>
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[--color-vermilion] px-3 py-1 text-xs font-medium text-white">
          最受欢迎
        </span>
      )}
      <div className="serif text-2xl">{tier}</div>
      <div className="mt-1 text-3xl font-semibold">{price}</div>
      <ul className="mt-4 space-y-1.5 text-sm text-[--color-mist-500]">
        {perks.map((p, i) => (
          <li key={i}>· {p}</li>
        ))}
      </ul>
    </div>
  )
}

function ChartPreview() {
  // Simple BaZi 4-pillar mock
  const pillars = [
    { label: '年柱', tg: '甲', dz: '子', sg: '比肩' },
    { label: '月柱', tg: '庚', dz: '午', sg: '七杀' },
    { label: '日柱', tg: '辛', dz: '酉', sg: '日主' },
    { label: '时柱', tg: '戊', dz: '戌', sg: '正印' },
  ]
  return (
    <div className="card w-full max-w-md">
      <div className="text-xs font-medium text-[--color-mist-400]">命盘示例（脱敏）</div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {pillars.map((p) => (
          <div key={p.label} className="rounded-md border border-[--color-ink]/10 bg-[--color-mist-50] p-2">
            <div className="text-[10px] text-[--color-mist-400]">{p.label}</div>
            <div className="glyph mt-1 text-2xl">{p.tg}</div>
            <div className="glyph text-2xl text-[--color-mist-500]">{p.dz}</div>
            <div className="mt-1 text-[10px] text-[--color-mist-500]">{p.sg}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[--color-mist-500]">
        <div className="rounded-md bg-[--color-jade]/10 p-2 text-center">用神 · 金水</div>
        <div className="rounded-md bg-[--color-bronze]/10 p-2 text-center">格局 · 建禄</div>
        <div className="rounded-md bg-[--color-vermilion]/10 p-2 text-center">大运 · 偏财</div>
      </div>
    </div>
  )
}
