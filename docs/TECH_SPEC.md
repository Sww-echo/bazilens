# 命语二开 · 技术实现规格 (TECH_SPEC)

> 配合 PLAN.md 使用。本文档关注"具体怎么写代码"。
> 所有路径基于 mingyu 项目根目录。

---

## 0. 仓库改造前：环境检查清单

```bash
# 必备版本
node -v   # ≥ 20.x （Supabase Edge Function Deno 运行时也需要）
npm -v    # ≥ 10.x
git --version

# 全局工具
npm i -g supabase            # Supabase CLI
npm i -g @ionic/cli          # Capacitor 用
npm i -g vercel              # 部署
```

**必备账号**（按优先级）：
1. Supabase (免费档)
2. Anthropic API ($10 起步) — Pro 档使用
3. OpenAI API ($10 起步) — Plus 档使用
4. DeepSeek API (¥50 起步) — Free 档使用
5. Stripe (免费，激活账号需要银行卡或 Wise)
6. Sentry (免费档)
7. PostHog (免费档 1M events/mo)
8. Vercel (免费档)
9. Resend (免费档 3000 emails/mo)
10. Apple Developer ($99/年 — 提前申请)

---

## 1. 仓库结构改造方案

### 1.1 新增目录

```
mingyu/
├── src/
│   ├── api/                    [新增] 前端调后端的封装层
│   │   ├── client.ts                 Supabase client 单例
│   │   ├── auth.ts                   登录/注册/登出
│   │   ├── charts.ts                 命盘 CRUD
│   │   ├── readings.ts               AI 解读（流式）
│   │   ├── subscriptions.ts          订阅状态查询
│   │   └── reports.ts                详批 PDF
│   ├── stores/                 [新增] 全局状态（Zustand 或 Context）
│   │   ├── authStore.ts              当前用户
│   │   ├── subscriptionStore.ts      订阅档位
│   │   └── quotaStore.ts             配额余额
│   ├── i18n/                   [新增] 国际化
│   │   ├── index.ts                  i18next 初始化
│   │   └── locales/
│   │       ├── zh-CN.json
│   │       ├── zh-TW.json
│   │       └── en.json
│   └── pages/
│       ├── auth/               [新增] LoginPage / SignupPage / ResetPasswordPage
│       ├── account/            [新增] AccountPage / SubscriptionPage / BillingPage
│       └── upgrade/            [新增] UpgradePage（升级促销）
├── supabase/                   [新增] Supabase 工程
│   ├── config.toml                   supabase init 生成
│   ├── migrations/
│   │   └── 0001_init.sql            初始化所有表 + RLS + reports 扩展字段（见 §13.7 + §2）
│   ├── functions/
│   │   ├── reading/                  POST 流式 AI 解读
│   │   │   └── index.ts
│   │   ├── checkout/                 创建 Stripe Checkout session（订阅 + PDF 单次付费）
│   │   │   └── index.ts
│   │   ├── stripe-webhook/           Stripe 事件处理（含 PDF 付款触发 report-generate）
│   │   │   └── index.ts
│   │   ├── revenuecat-webhook/       RevenueCat 事件处理（Sprint 2）
│   │   │   └── index.ts
│   │   ├── report-generate/          异步生成 PDF（核心利润中心，见 §14）
│   │   │   ├── index.ts
│   │   │   ├── chapters.ts                7 章 prompt 编排
│   │   │   ├── pdf-render.tsx             react-pdf 模板
│   │   │   └── assets/
│   │   │       ├── NotoSansSC-Subset.ttf  中文字体子集（~800KB）
│   │   │       └── logo.png
│   │   └── _shared/                  公共代码
│   │       ├── cors.ts
│   │       ├── auth.ts               JWT 校验
│   │       ├── quota.ts              配额扣减
│   │       ├── llm.ts                三模型客户端 + fallback（见 §4.5）
│   │       ├── cost.ts               成本计算
│   │       └── prompts.ts            提示词组装
└── capacitor.config.ts         [Sprint 2 新增]
```

### 1.2 新增依赖

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@stripe/stripe-js": "^4.0.0",
    "i18next": "^23.0.0",
    "react-i18next": "^14.0.0",
    "zustand": "^4.5.0",
    "@sentry/react": "^8.0.0",
    "posthog-js": "^1.150.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "supabase": "^1.190.0"
  }
}
```

> Edge Function（Deno）侧依赖通过 `npm:` / `jsr:` 直接 import，不在 package.json 中声明。
> 关键 Deno 依赖：`npm:@anthropic-ai/sdk@0.30.0`、`npm:openai@4.70.0`、`npm:@react-pdf/renderer@3.4.0`、`npm:stripe@17.0.0`、`npm:resend@4.0.0`、`npm:satori@0.10.0`（见 §14）。

### 1.3 环境变量（前端）

`.env.local`（**不要提交**）：
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SENTRY_DSN=https://...
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://app.posthog.com
```

### 1.4 环境变量（Edge Function，存 Supabase Secrets）

```bash
# 用 supabase secrets set 命令注入
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
REVENUECAT_WEBHOOK_AUTH=Bearer ...
RESEND_API_KEY=re_...
APP_URL=https://yourdomain.com
SUPABASE_STORAGE_BUCKET_REPORTS=reports     # PDF 私有 bucket
PDF_SIGNED_URL_TTL_SECONDS=86400            # 24 小时
```

---

## 2. 数据库完整 DDL

`supabase/migrations/0001_init.sql`：

```sql
-- =================== 1. profiles ===================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  locale text default 'zh-CN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger profiles_updated_at before update on profiles
  for each row execute function moddatetime(updated_at);

-- 用户注册自动创建 profile
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, display_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 'zh-CN');
  insert into usage_quotas (user_id, period_start) values (new.id, date_trunc('month', now()));
  insert into subscriptions (user_id, tier) values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =================== 2. charts ===================
create table charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('bazi','ziwei','liuyao','meihua','qimen','liuren','tarot','ssgw')),
  title text not null,
  input_data jsonb not null,
  chart_data jsonb not null,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index charts_user_created on charts (user_id, created_at desc);
create index charts_user_type on charts (user_id, type);

-- =================== 3. readings ===================
create table readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  chart_id uuid references charts on delete set null,
  scene text not null,
  question text,
  prompt jsonb not null,
  response text,
  model text not null,
  prompt_version text not null,
  tokens_input int default 0,
  tokens_output int default 0,
  cost_usd numeric(10,6) default 0,
  status text default 'pending' check (status in ('pending','streaming','completed','failed')),
  error_message text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index readings_user_created on readings (user_id, created_at desc);
create index readings_chart on readings (chart_id);

-- =================== 4. usage_quotas ===================
create table usage_quotas (
  user_id uuid primary key references profiles on delete cascade,
  period_start date not null,
  readings_used int default 0,
  pdf_reports_used int default 0,
  updated_at timestamptz default now()
);

-- =================== 5. subscriptions ===================
create table subscriptions (
  user_id uuid primary key references profiles on delete cascade,
  tier text not null default 'free' check (tier in ('free','plus','pro')),
  source text check (source in ('stripe','revenuecat')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  revenuecat_app_user_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  status text default 'active' check (status in ('active','canceled','past_due','trialing','expired')),
  cancel_at_period_end boolean default false,
  raw jsonb,
  updated_at timestamptz default now()
);

create index subscriptions_stripe_customer on subscriptions (stripe_customer_id);

-- =================== 6. reports ===================
create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  chart_id uuid not null references charts on delete cascade,
  type text not null check (type in ('full_bazi','liunian','compatibility','ziwei_full')),
  status text default 'pending' check (status in ('pending','paid','generating','ready','failed','refunded')),
  -- 进度 + 中间数据（见 §14 异步生成）
  progress smallint default 0 check (progress between 0 and 100),
  sections jsonb,                                     -- 各章节生成的中间数据
  -- 付费信息
  paid_at timestamptz,
  amount_usd numeric(10,2),
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text,
  -- 输出物
  pdf_url text,                                       -- Supabase Storage 路径
  pdf_size_bytes int,
  -- 模型与成本
  model_used text,                                    -- 'claude' | 'gpt-4.1'（含 fallback 记录）
  total_tokens_input int default 0,
  total_tokens_output int default 0,
  total_cost_usd numeric(10,6) default 0,
  -- 质量与反馈
  quality_score smallint,                             -- 红线检测分（0-100，自动）
  user_rating smallint check (user_rating between 1 and 5),
  user_feedback text,
  -- 退款
  refund_id text,                                     -- Stripe refund_id
  refund_amount_usd numeric(10,2),
  refund_reason text,
  refunded_at timestamptz,
  -- 错误
  error_message text,
  retry_count smallint default 0,
  -- 时间戳
  created_at timestamptz default now(),
  generation_started_at timestamptz,
  ready_at timestamptz
);

create index reports_user_created on reports (user_id, created_at desc);
create index reports_status on reports (status) where status in ('paid','generating','failed');
create index reports_stripe_session on reports (stripe_checkout_session_id);

-- =================== 7. prompt_versions（提示词版本化）===================
create table prompt_versions (
  id text primary key,            -- 'bazi-marriage-v1', 'ziwei-career-v2'
  scene text not null,
  category text not null,         -- 'bazi' | 'ziwei' | 'divination'
  template text not null,         -- prompt 模板（含 {{变量}} 占位）
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- =================== RLS ===================
alter table profiles enable row level security;
alter table charts enable row level security;
alter table readings enable row level security;
alter table usage_quotas enable row level security;
alter table subscriptions enable row level security;
alter table reports enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own charts" on charts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- readings 客户端只读，写入只能由 service_role 进行
create policy "read own readings" on readings
  for select using (auth.uid() = user_id);
create policy "rate own readings" on readings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read own quota" on usage_quotas
  for select using (auth.uid() = user_id);

create policy "read own sub" on subscriptions
  for select using (auth.uid() = user_id);

create policy "own reports" on reports
  for select using (auth.uid() = user_id);

-- prompt_versions 不开 RLS（公开只读，由 service_role 写）
alter table prompt_versions enable row level security;
create policy "anyone read active prompts" on prompt_versions
  for select using (active = true);
```

---

## 3. 配额原子扣减（关键）

直接 update 容易出现并发竞争。用 Postgres 函数保证原子性：

```sql
-- 原子扣减解读配额，返回是否成功
create function consume_reading_quota(
  p_user_id uuid,
  p_tier text
) returns table (allowed boolean, remaining int, reason text) as $$
declare
  v_limit int;
  v_quota usage_quotas;
  v_period_start date := date_trunc('month', now())::date;
begin
  -- 获取本月配额行（lock 行）
  select * into v_quota from usage_quotas
    where user_id = p_user_id
    for update;

  -- 跨月重置
  if v_quota.period_start < v_period_start then
    update usage_quotas
      set period_start = v_period_start,
          readings_used = 0,
          pdf_reports_used = 0,
          updated_at = now()
      where user_id = p_user_id
      returning * into v_quota;
  end if;

  -- 不同档位限额
  v_limit := case p_tier
    when 'free' then 3
    when 'plus' then 30
    when 'pro' then 99999
    else 3 end;

  if v_quota.readings_used >= v_limit then
    return query select false, 0, 'quota_exceeded';
    return;
  end if;

  update usage_quotas
    set readings_used = readings_used + 1,
        updated_at = now()
    where user_id = p_user_id;

  return query select true, (v_limit - v_quota.readings_used - 1), null::text;
end;
$$ language plpgsql security definer;
```

---

## 4. Edge Function：AI 解读 (`supabase/functions/reading/index.ts`)

```typescript
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import OpenAI from 'npm:openai@4.70.0'

const ANTHROPIC = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const OPENAI = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
const DEEPSEEK_KEY = Deno.env.get('DEEPSEEK_API_KEY')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return cors()

  // 1. JWT 校验
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: userData, error: authErr } = await supabase.auth.getUser(auth)
  if (authErr || !userData.user) return json({ error: 'unauthorized' }, 401)
  const user = userData.user

  // 2. 解析请求
  const body = await req.json()
  const { chart_id, scene, question, prompt_version } = body

  // 3. 查订阅档位
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', user.id)
    .single()
  const tier = sub?.status === 'active' ? sub.tier : 'free'

  // 4. 配额扣减（原子）
  const { data: quotaRes } = await supabase.rpc('consume_reading_quota', {
    p_user_id: user.id, p_tier: tier
  })
  if (!quotaRes?.[0]?.allowed) {
    return json({ error: 'quota_exceeded' }, 402)
  }

  // 5. 加载命盘 + 提示词模板
  const { data: chart } = await supabase
    .from('charts').select('*').eq('id', chart_id)
    .eq('user_id', user.id).single()
  if (!chart) return json({ error: 'chart_not_found' }, 404)

  const { data: tpl } = await supabase
    .from('prompt_versions').select('template')
    .eq('id', prompt_version).single()
  const prompt = renderTemplate(tpl!.template, { chart, scene, question })

  // 6. 模型路由（三档）
  type Provider = 'claude' | 'openai' | 'deepseek'
  const route: Record<string, { provider: Provider; model: string }> = {
    pro:  { provider: 'claude',   model: 'claude-sonnet-4-5-20250929' },
    plus: { provider: 'openai',   model: 'gpt-4.1' },
    free: { provider: 'deepseek', model: 'deepseek-chat' }
  }
  const { provider, model } = route[tier] ?? route.free

  // 7. 创建 readings 记录
  const { data: reading } = await supabase.from('readings').insert({
    user_id: user.id,
    chart_id,
    scene,
    question,
    prompt: { template: prompt_version, rendered: prompt },
    model,
    prompt_version,
    status: 'streaming'
  }).select().single()

  // 8. 流式调用 + SSE 返回
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      let fullResponse = ''
      let tokensIn = 0, tokensOut = 0

      try {
        if (provider === 'claude') {
          const resp = await ANTHROPIC.messages.stream({
            model,
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
          })
          for await (const ev of resp) {
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
              const text = ev.delta.text
              fullResponse += text
              controller.enqueue(enc.encode(`data: ${JSON.stringify({type:'delta',text})}\n\n`))
            }
          }
          const final = await resp.finalMessage()
          tokensIn = final.usage.input_tokens
          tokensOut = final.usage.output_tokens
        } else if (provider === 'openai') {
          const resp = await OPENAI.chat.completions.create({
            model,
            max_tokens: 4000,
            stream: true,
            stream_options: { include_usage: true },
            messages: [{ role: 'user', content: prompt }]
          })
          for await (const chunk of resp) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              fullResponse += text
              controller.enqueue(enc.encode(`data: ${JSON.stringify({type:'delta',text})}\n\n`))
            }
            if (chunk.usage) {
              tokensIn = chunk.usage.prompt_tokens
              tokensOut = chunk.usage.completion_tokens
            }
          }
        } else {
          // DeepSeek 流式（OpenAI 兼容）
          const r = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DEEPSEEK_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              stream: true,
              max_tokens: 4000
            })
          })
          const reader = r.body!.getReader()
          const dec = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const j = JSON.parse(data)
                const text = j.choices[0]?.delta?.content || ''
                if (text) {
                  fullResponse += text
                  controller.enqueue(enc.encode(`data: ${JSON.stringify({type:'delta',text})}\n\n`))
                }
                if (j.usage) { tokensIn = j.usage.prompt_tokens; tokensOut = j.usage.completion_tokens }
              } catch {}
            }
          }
        }

        // 9. 完成事件 + 落库
        const cost = computeCost(model, tokensIn, tokensOut)
        await supabase.from('readings').update({
          response: fullResponse,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          cost_usd: cost,
          status: 'completed',
          completed_at: new Date().toISOString()
        }).eq('id', reading.id)

        controller.enqueue(enc.encode(
          `data: ${JSON.stringify({ type: 'done', reading_id: reading.id })}\n\n`
        ))
      } catch (e) {
        await supabase.from('readings').update({
          status: 'failed', error_message: String(e)
        }).eq('id', reading.id)
        controller.enqueue(enc.encode(
          `data: ${JSON.stringify({ type:'error', message: String(e) })}\n\n`
        ))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders()
    }
  })
})

function computeCost(model: string, tin: number, tout: number): number {
  // Claude Sonnet 4.5/4.6: $3/MTok in, $15/MTok out
  // GPT-4.1: $2/MTok in, $8/MTok out
  // DeepSeek: $0.27/MTok in, $1.10/MTok out
  if (model.startsWith('claude'))   return (tin*3    + tout*15)   / 1_000_000
  if (model.startsWith('gpt'))      return (tin*2    + tout*8)    / 1_000_000
  return (tin*0.27 + tout*1.10) / 1_000_000
}

function renderTemplate(tpl: string, ctx: any): string {
  return tpl.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const val = path.split('.').reduce((o, k) => o?.[k], ctx)
    return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
  })
}

function cors() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
}
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  })
}
```

---

## 4.5 三模型 Fallback 抽象层 (`supabase/functions/_shared/llm.ts`)

> §4 的 `reading/index.ts` 当前在主流程内 inline 写了三分支，可读但不可复用。`report-generate`（见 §14）也要调用同一套三模型，必须抽象。
> Fallback 策略：Pro Claude 失败 → GPT-4.1；Plus GPT-4.1 失败 → DeepSeek；Free DeepSeek 失败 → 直接返回错误（不再降级）。

```typescript
// supabase/functions/_shared/llm.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import OpenAI from 'npm:openai@4.70.0'

export type Provider = 'claude' | 'openai' | 'deepseek'

export type LLMRequest = {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  // Anthropic prompt cache key（PDF 多章节生成时复用命盘 prefix）
  cachePrefix?: string
}

export type LLMResponse = {
  text: string
  provider: Provider
  model: string
  tokensInput: number
  tokensOutput: number
  cacheHitTokens?: number   // Anthropic cache read tokens
  costUsd: number
}

export type StreamCallback = (delta: string) => void

const ANTHROPIC = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const OPENAI = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
const DEEPSEEK_KEY = Deno.env.get('DEEPSEEK_API_KEY')!

// =================== 路由表 ===================
const TIER_ROUTE: Record<string, { provider: Provider; model: string }> = {
  pro:  { provider: 'claude',   model: 'claude-sonnet-4-5-20250929' },
  plus: { provider: 'openai',   model: 'gpt-4.1' },
  free: { provider: 'deepseek', model: 'deepseek-chat' },
}

// 降级链：tier 主模型失败时的下一档
const FALLBACK_CHAIN: Record<Provider, Provider | null> = {
  claude: 'openai',     // Claude 挂 → GPT
  openai: 'deepseek',   // GPT 挂 → DeepSeek
  deepseek: null,       // DeepSeek 挂 → 不再降级
}

// =================== 主入口（流式）===================
export async function callLLMStream(
  tier: 'free' | 'plus' | 'pro',
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  const initial = TIER_ROUTE[tier] ?? TIER_ROUTE.free
  const tried: Provider[] = []
  let lastError: unknown

  let current: { provider: Provider; model: string } | null = initial
  while (current) {
    try {
      tried.push(current.provider)
      const result = await dispatchStream(current.provider, current.model, req, onDelta)
      // 成功：如果是降级请求，记录 fallback 事件
      if (tried.length > 1) {
        console.warn(`[llm] fallback success: ${tried.join(' → ')}`)
      }
      return result
    } catch (e) {
      lastError = e
      console.error(`[llm] ${current.provider} failed:`, e)
      const next = FALLBACK_CHAIN[current.provider]
      current = next ? { provider: next, model: TIER_ROUTE[providerToTier(next)].model } : null
    }
  }
  throw new Error(`All providers failed (tried: ${tried.join(', ')}). Last error: ${lastError}`)
}

function providerToTier(p: Provider): 'free' | 'plus' | 'pro' {
  return p === 'claude' ? 'pro' : p === 'openai' ? 'plus' : 'free'
}

// =================== 单 Provider 流式分发 ===================
async function dispatchStream(
  provider: Provider,
  model: string,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  if (provider === 'claude') return callClaude(model, req, onDelta)
  if (provider === 'openai') return callOpenAI(model, req, onDelta)
  return callDeepSeek(model, req, onDelta)
}

// --- Claude（含 prompt cache 支持） ---
async function callClaude(model: string, req: LLMRequest, onDelta: StreamCallback): Promise<LLMResponse> {
  const messages: any[] = []
  // cachePrefix（PDF 多章节复用命盘）走独立 user message + cache_control
  if (req.cachePrefix) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: req.cachePrefix, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: req.prompt }
      ]
    })
  } else {
    messages.push({ role: 'user', content: req.prompt })
  }

  const stream = await ANTHROPIC.messages.stream({
    model,
    max_tokens: req.maxTokens ?? 4000,
    system: req.systemPrompt,
    messages,
  })

  let text = ''
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
      text += ev.delta.text
      onDelta(ev.delta.text)
    }
  }
  const final = await stream.finalMessage()
  const tokensInput = final.usage.input_tokens
  const tokensOutput = final.usage.output_tokens
  const cacheHit = (final.usage as any).cache_read_input_tokens ?? 0
  const cacheWrite = (final.usage as any).cache_creation_input_tokens ?? 0

  // Claude Sonnet 4.5/4.6: $3/$15 per MTok; cache write $3.75; cache read $0.30
  const costUsd =
    ((tokensInput - cacheHit - cacheWrite) * 3 +
     cacheWrite * 3.75 +
     cacheHit * 0.30 +
     tokensOutput * 15) / 1_000_000

  return {
    text, provider: 'claude', model,
    tokensInput, tokensOutput, cacheHitTokens: cacheHit, costUsd
  }
}

// --- OpenAI GPT-4.1（流式）---
async function callOpenAI(model: string, req: LLMRequest, onDelta: StreamCallback): Promise<LLMResponse> {
  const messages: any[] = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  messages.push({ role: 'user', content: req.prompt })

  const resp = await OPENAI.chat.completions.create({
    model,
    max_tokens: req.maxTokens ?? 4000,
    stream: true,
    stream_options: { include_usage: true },
    messages,
  })

  let text = '', tokensInput = 0, tokensOutput = 0
  for await (const chunk of resp) {
    const delta = chunk.choices[0]?.delta?.content || ''
    if (delta) { text += delta; onDelta(delta) }
    if (chunk.usage) {
      tokensInput = chunk.usage.prompt_tokens
      tokensOutput = chunk.usage.completion_tokens
    }
  }

  // GPT-4.1: $2/$8 per MTok
  const costUsd = (tokensInput * 2 + tokensOutput * 8) / 1_000_000

  return { text, provider: 'openai', model, tokensInput, tokensOutput, costUsd }
}

// --- DeepSeek（OpenAI 兼容协议）---
async function callDeepSeek(model: string, req: LLMRequest, onDelta: StreamCallback): Promise<LLMResponse> {
  const messages: any[] = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  messages.push({ role: 'user', content: req.prompt })

  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: req.maxTokens ?? 4000 }),
  })
  if (!r.ok) throw new Error(`DeepSeek HTTP ${r.status}: ${await r.text()}`)

  const reader = r.body!.getReader()
  const dec = new TextDecoder()
  let buf = '', text = '', tokensInput = 0, tokensOutput = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6); if (data === '[DONE]') continue
      try {
        const j = JSON.parse(data)
        const delta = j.choices[0]?.delta?.content || ''
        if (delta) { text += delta; onDelta(delta) }
        if (j.usage) { tokensInput = j.usage.prompt_tokens; tokensOutput = j.usage.completion_tokens }
      } catch {}
    }
  }

  // DeepSeek: $0.27/$1.10 per MTok
  const costUsd = (tokensInput * 0.27 + tokensOutput * 1.10) / 1_000_000

  return { text, provider: 'deepseek', model, tokensInput, tokensOutput, costUsd }
}

// =================== 非流式（PDF 章节生成用）===================
export async function callLLM(
  tier: 'free' | 'plus' | 'pro',
  req: LLMRequest,
): Promise<LLMResponse> {
  let buf = ''
  return await callLLMStream(tier, req, (d) => { buf += d })
}
```

**§4 主路由代码改造**：把 `reading/index.ts` 第 8 步流式分支替换为：

```typescript
import { callLLMStream } from '../_shared/llm.ts'

const result = await callLLMStream(tier, {
  prompt,
  systemPrompt: 'You are a professional Chinese metaphysics scholar...',
  maxTokens: 4000,
}, (delta) => {
  controller.enqueue(enc.encode(`data: ${JSON.stringify({type:'delta',text:delta})}\n\n`))
})

// 落库
await supabase.from('readings').update({
  response: result.text,
  tokens_input: result.tokensInput,
  tokens_output: result.tokensOutput,
  cost_usd: result.costUsd,
  model: `${result.provider}:${result.model}`,
  status: 'completed',
  completed_at: new Date().toISOString(),
}).eq('id', reading.id)
```

### 4.5.1 Fallback 配额补偿

降级时**不扣本档配额，扣下一档**：

```typescript
// reading/index.ts 调用 callLLMStream 后
if (result.provider !== TIER_ROUTE[tier].provider) {
  // 发生了降级 → 不扣本档配额
  await supabase.rpc('rollback_reading_quota', { p_user_id: user.id })
  // 记录降级事件给运维监控
  await supabase.from('readings').update({
    error_message: `fallback: ${TIER_ROUTE[tier].provider} → ${result.provider}`
  }).eq('id', reading.id)
}
```

需要在 §3 配额扣减后加一个回滚 RPC：

```sql
create function rollback_reading_quota(p_user_id uuid) returns void as $$
begin
  update usage_quotas
    set readings_used = greatest(0, readings_used - 1),
        updated_at = now()
    where user_id = p_user_id;
end;
$$ language plpgsql security definer;
```

### 4.5.2 健康检查（Sprint 2 加）

每 5 分钟一个 cron Edge Function 探活三 provider：

```typescript
// supabase/functions/llm-healthcheck/index.ts（Sprint 2）
// 用最便宜的 1 token 请求探活，结果存 Supabase KV / Redis
// 任一 provider 连续 3 次失败 → Slack/邮件告警
```

Sprint 1 不做健康检查，依赖 Sentry 异常告警。

---

## 5. 前端流式渲染 (`src/api/readings.ts` + 解读页)

```typescript
// src/api/readings.ts
import { supabase } from './client'

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; reading_id: string }
  | { type: 'error'; message: string }

export async function* streamReading(input: {
  chart_id: string
  scene: string
  question: string
  prompt_version: string
}): AsyncGenerator<StreamEvent> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_logged_in')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reading`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || `http_${r.status}`)
  }

  const reader = r.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      yield JSON.parse(line.slice(6)) as StreamEvent
    }
  }
}
```

```tsx
// src/pages/ResultPage.tsx 内部使用
const [text, setText] = useState('')
const [status, setStatus] = useState<'idle'|'streaming'|'done'|'error'>('idle')

async function start() {
  setText(''); setStatus('streaming')
  try {
    for await (const ev of streamReading({ chart_id, scene, question, prompt_version })) {
      if (ev.type === 'delta') setText(t => t + ev.text)
      else if (ev.type === 'done') setStatus('done')
      else if (ev.type === 'error') { setStatus('error'); /* show toast */ }
    }
  } catch (e) {
    if (String(e).includes('quota_exceeded')) navigate('/upgrade')
    else setStatus('error')
  }
}
```

---

## 6. Stripe 接入

### 6.1 Stripe Dashboard 配置

创建 3 个 Product，每个 Product 下两个 Price（月/年）：

| Product | Price 月 | Price 年 | Lookup Key |
|---------|---------|---------|------------|
| MingYu Plus | $4.99 | $39.99 | `plus_monthly` / `plus_yearly` |
| MingYu Pro | $9.99 | $79.99 | `pro_monthly` / `pro_yearly` |

把 lookup_key 存到前端常量，避免硬编码 price_id。

### 6.2 Edge Function：`/functions/checkout`

```typescript
// 关键逻辑：根据 lookup_key 查 price，创建 Checkout session，
// metadata 写 user_id，success_url 跳回 /account/subscription?success=1
import Stripe from 'npm:stripe@17.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// 拿到 user → 找 customer（subscriptions.stripe_customer_id），没有就 create
const customer = sub?.stripe_customer_id ||
  (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id

// 写回 subscriptions 表
const prices = await stripe.prices.list({ lookup_keys: [body.lookup_key], expand: ['data.product'] })
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer,
  line_items: [{ price: prices.data[0].id, quantity: 1 }],
  success_url: `${APP_URL}/account/subscription?ok=1`,
  cancel_url: `${APP_URL}/upgrade`,
  metadata: { user_id: user.id }
})
return json({ url: session.url })
```

### 6.3 Webhook：`/functions/stripe-webhook`

需要处理的事件：
- `checkout.session.completed` — 首次订阅成功
- `customer.subscription.updated` — 续费、降级、升级
- `customer.subscription.deleted` — 取消
- `invoice.payment_failed` — 扣款失败 → 标记 past_due

```typescript
const sig = req.headers.get('stripe-signature')!
const body = await req.text()
const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)

switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated': {
    const s = event.data.object
    const tier = priceLookupToTier(s.items.data[0].price.lookup_key)
    await supabase.from('subscriptions').update({
      tier,
      source: 'stripe',
      stripe_subscription_id: s.id,
      current_period_start: new Date(s.current_period_start * 1000).toISOString(),
      current_period_end: new Date(s.current_period_end * 1000).toISOString(),
      status: s.status === 'active' ? 'active' : s.status,
      cancel_at_period_end: s.cancel_at_period_end,
      raw: s
    }).eq('stripe_customer_id', s.customer)
    break
  }
  case 'customer.subscription.deleted': {
    await supabase.from('subscriptions').update({
      tier: 'free', status: 'expired'
    }).eq('stripe_subscription_id', event.data.object.id)
    break
  }
}
```

### 6.4 Customer Portal

不要自己写取消/换卡 UI，直接跳 Stripe Customer Portal：

```typescript
const portal = await stripe.billingPortal.sessions.create({
  customer: stripe_customer_id,
  return_url: `${APP_URL}/account`
})
return json({ url: portal.url })
```

---

## 7. 提示词版本化

### 7.1 为什么版本化
- AI 解读质量是核心，提示词要持续迭代
- 老用户的解读历史不能因为 prompt 改了就 broken
- A/B 测试不同版本质量

### 7.2 命名规则
`{category}-{scene}-v{n}`
- `bazi-marriage-v1` `bazi-marriage-v2`
- `ziwei-career-v1`
- `liuyao-general-v1`

### 7.3 模板示例（存 prompt_versions 表）

```
你是一位精通{{category_name}}的传统命理学者，请基于以下信息生成专业的{{scene_name}}解读。

【命盘数据】
{{chart.chart_data}}

【咨询者具体问题】
{{question}}

请按以下结构输出（Markdown 格式）：
## 总览
（200-300 字，整体格局判断）
## 关键因素
（列出 3-5 个最重要的命理因素）
## 详细分析
（深入解读，800-1200 字）
## 建议与提醒
（具体可执行的行动建议）

注意：
- 措辞专业但不晦涩，避免过于宿命论
- 不预测疾病、死亡、官非等敏感事项
- 末尾加："本解读为传统命理研究参考，不构成任何专业建议。"
```

### 7.4 加载策略
- Edge Function 启动时加缓存（5 分钟 TTL）
- 模板变量用 `{{path.to.field}}` 简单语法（见 `renderTemplate`）

---

## 8. i18n 改造步骤

```bash
npm i i18next react-i18next i18next-browser-languagedetector
```

`src/i18n/index.ts`：
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    'en': { translation: en }
  },
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false }
})
export default i18n
```

**优先级**：
1. P0 立刻翻译：登录、订阅、设置、错误提示
2. P1 后续：命盘输入页、结果页骨架
3. P2 暂不翻：八字术语、命理结果（海外华人能看懂中文）

---

## 9. Sentry + PostHog 关键埋点

```typescript
// 用户行为漏斗（PostHog）
posthog.capture('signup_completed', { method: 'email' })
posthog.capture('first_chart_created', { type: 'bazi' })
posthog.capture('first_reading_started', { scene: 'marriage', model: 'gpt-4.1' })
posthog.capture('first_reading_completed', { duration_ms, tokens_out })
posthog.capture('upgrade_clicked', { from: 'quota_modal', target_tier: 'plus' })
posthog.capture('checkout_started', { tier: 'plus', period: 'monthly' })
posthog.capture('subscription_active', { tier, source: 'stripe' })
posthog.capture('reading_rated', { rating, model })
```

```typescript
// 错误（Sentry）
import * as Sentry from '@sentry/react'
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 过滤掉用户取消等正常操作
    if (event.exception?.values?.[0]?.value?.includes('user_cancelled')) return null
    return event
  }
})
```

---

## 10. 部署清单（Vercel）

`vercel.json`：
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

部署步骤：
1. Vercel 连 GitHub 仓库
2. 环境变量按 1.3 节填入
3. 自定义域名（DNS A/CNAME 指向 Vercel）
4. Supabase 项目 Site URL 加上正式域名
5. Stripe Webhook endpoint 配置 `https://xxx.supabase.co/functions/v1/stripe-webhook`
6. PostHog 关闭 session recording（隐私 + 省额度）

---

## 11. 验收标准（DoD = Definition of Done）

每个 task 完成时必须满足：

| Task | DoD |
|------|-----|
| 数据库建表 | 6 张表 + RLS + 触发器 + RPC 函数全部跑通；用 anon key 越权访问被拒绝 |
| Auth 集成 | 邮箱注册→收验证邮件→登录→profiles 自动创建；Google OAuth 跑通 |
| 命盘云存 | 登录后排盘自动存云；切换设备能看到记录；未登录用户首次登录后本地数据迁移成功 |
| AI Edge Function | curl 测试流式输出正常；配额耗尽返回 402；模型路由按 tier 正确分流 |
| 流式 UI | 解读页打字机效果流畅；网络中断有错误提示；可以重新生成 |
| Stripe 订阅 | 测试卡 4242 走完订阅；webhook 接收后 subscriptions 表 1s 内更新；Customer Portal 取消立即生效 |
| 配额逻辑 | 并发请求测试不会超扣；月初自动重置 |
| i18n | zh-CN 完整；zh-TW 简繁转换；en 占位翻译关键路径 |
| 监控 | Sentry 能捕获前端报错；PostHog 看得到漏斗 |
| 部署 | 自定义域名 HTTPS；Lighthouse 性能 ≥ 80；移动端样式正常 |

---

## 12. 测试策略

**MVP 阶段不写单测**，靠下面三层兜底：

1. **类型安全**：TypeScript strict + 数据库类型用 `supabase gen types typescript` 自动生成
2. **手工冒烟测试**：每完成一个大模块用 checklist 跑一遍主流程
3. **错误监控**：Sentry 捕获生产环境异常，PostHog 看用户行为是否符合预期

到 Month 3 用户量起来后再引入：
- E2E：Playwright 跑核心付费链路
- 单元测试：八字引擎关键算法（其实上游已经有了）

---

## 13. 安全要点 Checklist

- [ ] `.env*` 加入 `.gitignore`
- [ ] Supabase service_role key **绝不**出现在前端代码或 Vercel 公开变量
- [ ] Edge Function 所有路由先校验 JWT
- [ ] Stripe webhook 必须校验签名
- [ ] RLS 策略覆盖所有用户数据表
- [ ] AI 输出做敏感词过滤（医疗 / 死亡 / 自杀类关键字触发"请咨询专业人士"）
- [ ] 用户输入做长度限制（question ≤ 500 字符防止 prompt 注入)
- [ ] Rate limiting：免费用户 IP + user_id 每分钟最多 3 次解读请求
- [ ] PII 不写入 Sentry / PostHog（用户邮箱、出生日期不上报）

---

## 14. PDF 详批生成 Edge Function (`supabase/functions/report-generate/`)

> 对应 PLAN §13 完整产品规格。本节给出代码骨架与编排。

### 14.1 触发链路

```
用户在前端点击「购买详批 $14.99」
        ↓
POST /functions/v1/checkout（type='pdf', report_type='full_bazi', chart_id=xxx）
        ↓
checkout/index.ts 创建 Stripe Checkout Session
  - mode: 'payment'（不是 subscription）
  - line_items: [{ price: PDF_PRICE_ID, quantity: 1 }]
  - metadata: { user_id, chart_id, report_type, kind: 'pdf' }
        ↓
用户付款 → Stripe 跳回 success_url=/reports/:id?pending=1
        ↓
Stripe Webhook 收到 'checkout.session.completed'
  - kind='pdf' 分支 → insert reports 行（status='paid', paid_at=now）
  - 异步触发 /functions/v1/report-generate（pg_notify 或 fetch）
        ↓
report-generate/index.ts 异步执行（无返回，前端不等）
        ↓
逐章生成 → 更新 progress → 渲染 PDF → 上传 Storage → 发邮件
```

### 14.2 Stripe Webhook 改造（在 §6.3 基础上加 PDF 分支）

```typescript
// stripe-webhook/index.ts 新增分支
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  const meta = session.metadata!

  if (meta.kind === 'pdf') {
    // PDF 单次付费
    const { data: report } = await supabase.from('reports').insert({
      user_id: meta.user_id,
      chart_id: meta.chart_id,
      type: meta.report_type,
      status: 'paid',
      paid_at: new Date().toISOString(),
      amount_usd: (session.amount_total ?? 0) / 100,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_checkout_session_id: session.id,
    }).select().single()

    // 异步触发生成（不 await，立即返回 200 给 Stripe）
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/report-generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report_id: report.id }),
    }).catch(err => console.error('[trigger report-generate]', err))
  } else {
    // 订阅分支（原 §6.3 逻辑）
    // ...
  }
  break
}
```

### 14.3 章节编排 (`report-generate/chapters.ts`)

```typescript
// 7 章定义（与 PLAN §13.2 对齐）
export const CHAPTERS = [
  { id: 'overview',    title: '命理总论',       maxTokens: 1200, promptVersion: 'bazi-pdf-overview-v1' },
  { id: 'wuxing',      title: '五行喜忌详解',   maxTokens: 1500, promptVersion: 'bazi-pdf-wuxing-v1' },
  { id: 'personality', title: '性格与人生走向', maxTokens: 1500, promptVersion: 'bazi-pdf-personality-v1' },
  { id: 'family',      title: '六亲缘分',       maxTokens: 1800, promptVersion: 'bazi-pdf-family-v1' },
  { id: 'dayun',       title: '大运流年走势',   maxTokens: 2000, promptVersion: 'bazi-pdf-dayun-v1' },
  { id: 'fortune',     title: '财运 健康 学业', maxTokens: 1800, promptVersion: 'bazi-pdf-fortune-v1' },
  { id: 'advice',      title: '实用建议',       maxTokens: 1200, promptVersion: 'bazi-pdf-advice-v1' },
] as const

export type ChapterId = typeof CHAPTERS[number]['id']
```

### 14.4 主流程 (`report-generate/index.ts`)

```typescript
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import Stripe from 'npm:stripe@17.0.0'
import { renderToBuffer } from 'npm:@react-pdf/renderer@3.4.0'
import { callLLM } from '../_shared/llm.ts'
import { CHAPTERS } from './chapters.ts'
import { ReportPDF } from './pdf-render.tsx'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET_REPORTS')!
const TTL = parseInt(Deno.env.get('PDF_SIGNED_URL_TTL_SECONDS') ?? '86400')

serve(async (req) => {
  const { report_id } = await req.json()

  // 防重入：状态机校验
  const { data: report, error } = await supabase.from('reports')
    .update({ status: 'generating', generation_started_at: new Date().toISOString() })
    .eq('id', report_id).eq('status', 'paid')   // 只有 paid 才能进 generating
    .select('*, charts(*), profiles!user_id(*)').single()
  if (error || !report) {
    return new Response('not_paid_or_already_processing', { status: 409 })
  }

  // 立即 ack（异步后台处理）
  generateReport(report).catch(async (e) => {
    console.error('[report-generate]', e)
    await supabase.from('reports').update({
      status: 'failed', error_message: String(e),
    }).eq('id', report_id)
    // 触发自动退款（24h 兜底）
    await scheduleAutoRefund(report_id)
  })

  return new Response('ok', { status: 202 })
})

async function generateReport(report: any) {
  const chartData = report.charts.chart_data
  const tier = 'pro'   // PDF 一律用 Pro 路由（Claude），保证质量

  // 共享 cache prefix：命盘数据 + 系统提示
  const cachePrefix = `命盘数据：\n${JSON.stringify(chartData, null, 2)}\n\n` +
                      `命主信息：${JSON.stringify(report.charts.input_data)}`

  const sections: Record<string, any> = {}
  let totalIn = 0, totalOut = 0, totalCost = 0
  let providerUsed = 'claude'

  for (const [i, ch] of CHAPTERS.entries()) {
    // 加载该章节 prompt 模板
    const { data: tpl } = await supabase.from('prompt_versions')
      .select('template').eq('id', ch.promptVersion).single()
    if (!tpl) throw new Error(`prompt_version not found: ${ch.promptVersion}`)

    const result = await callLLM(tier, {
      prompt: tpl.template,                    // 章节专属指令
      cachePrefix,                             // 命盘数据复用 cache
      maxTokens: ch.maxTokens,
    })

    sections[ch.id] = { title: ch.title, text: result.text }
    totalIn += result.tokensInput
    totalOut += result.tokensOutput
    totalCost += result.costUsd
    if (result.provider !== 'claude') providerUsed = `claude→${result.provider}`

    // 实时进度
    await supabase.from('reports').update({
      progress: Math.round(((i + 1) / CHAPTERS.length) * 100),
      sections,
    }).eq('id', report.id)
  }

  // 红线检测（见 §12.3 + PLAN §12.3）
  const qualityScore = await runRedlineChecks(sections)
  if (qualityScore < 60) {
    // 质量不过关：标记 failed 触发退款
    throw new Error(`quality_check_failed: score=${qualityScore}`)
  }

  // 渲染 PDF
  const pdfBuffer = await renderToBuffer(
    ReportPDF({ report, sections, chartData })
  )

  // 上传 Storage（私有 bucket）
  const path = `${report.user_id}/${report.id}.pdf`
  const { error: upErr } = await supabase.storage.from(BUCKET)
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw upErr

  // 落库
  await supabase.from('reports').update({
    status: 'ready',
    progress: 100,
    pdf_url: path,
    pdf_size_bytes: pdfBuffer.byteLength,
    model_used: providerUsed,
    total_tokens_input: totalIn,
    total_tokens_output: totalOut,
    total_cost_usd: totalCost,
    quality_score: qualityScore,
    ready_at: new Date().toISOString(),
  }).eq('id', report.id)

  // 生成签名 URL 发邮件
  const { data: signed } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, TTL)

  await resend.emails.send({
    from: 'reports@yourdomain.com',
    to: report.profiles.email,
    subject: '您的八字详批已生成',
    html: renderEmailTemplate({
      displayName: report.profiles.display_name,
      reportType: report.type,
      downloadUrl: signed!.signedUrl,
      ttlHours: TTL / 3600,
    }),
  })
}

async function runRedlineChecks(sections: Record<string, any>): Promise<number> {
  // 见 PLAN §12.3：神煞白名单 + 禁用断言 + 强制免责
  // 返回 0-100 分；< 60 视为不通过
  const allText = Object.values(sections).map((s: any) => s.text).join('\n')
  let score = 100
  // 检查禁用断言
  const banned = [/命中缺[金木水火土]/, /克[夫妻子]/, /必定/, /一定会/, /活不过/]
  for (const re of banned) if (re.test(allText)) score -= 20
  // 检查神煞白名单（简化版，完整列表见 baziShenSha.ts）
  // ...
  return Math.max(0, score)
}

async function scheduleAutoRefund(report_id: string) {
  // 简化：直接退款（生产环境应该用 cron 24h 后再退）
  const { data: r } = await supabase.from('reports').select('*')
    .eq('id', report_id).single()
  if (!r?.stripe_payment_intent_id) return
  const refund = await stripe.refunds.create({
    payment_intent: r.stripe_payment_intent_id,
    reason: 'requested_by_customer',
  })
  await supabase.from('reports').update({
    status: 'refunded',
    refund_id: refund.id,
    refund_amount_usd: r.amount_usd,
    refund_reason: 'generation_failed',
    refunded_at: new Date().toISOString(),
  }).eq('id', report_id)
}

function renderEmailTemplate(p: any): string {
  return `
    <p>${p.displayName} 您好，</p>
    <p>您购买的「八字详批 - ${p.reportType}」已生成完毕。</p>
    <p><a href="${p.downloadUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">立即下载</a></p>
    <p>下载链接 ${p.ttlHours} 小时内有效。如需重新下载，请登录 yourdomain.com 进入「我的报告」。</p>
    <p>本报告基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。</p>
  `
}
```

### 14.5 react-pdf 模板 (`report-generate/pdf-render.tsx`)

```tsx
import { Document, Page, Text, View, StyleSheet, Font, Image } from 'npm:@react-pdf/renderer@3.4.0'
import React from 'npm:react@18'

// 注册中文字体（子集，~800KB）
Font.register({
  family: 'NotoSansSC',
  src: new URL('./assets/NotoSansSC-Subset.ttf', import.meta.url).href,
})

const styles = StyleSheet.create({
  page: { fontFamily: 'NotoSansSC', padding: 50, fontSize: 11, lineHeight: 1.6 },
  cover: { textAlign: 'center', marginTop: 200 },
  title: { fontSize: 28, marginBottom: 20 },
  subtitle: { fontSize: 14, color: '#666' },
  chapterTitle: { fontSize: 18, marginTop: 30, marginBottom: 15, borderBottom: '1pt solid #000', paddingBottom: 5 },
  paragraph: { textAlign: 'justify', marginBottom: 10 },
  disclaimer: { fontSize: 9, color: '#888', marginTop: 50, padding: 15, border: '1pt solid #ccc' },
})

export function ReportPDF({ report, sections, chartData }: any) {
  return (
    <Document>
      {/* 封面 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.title}>八字一生总论</Text>
          <Text style={styles.subtitle}>命主：{maskName(report.profiles.display_name)}</Text>
          <Text style={styles.subtitle}>{formatBirth(report.charts.input_data)}</Text>
          <Text style={{ marginTop: 40 }}>报告编号：{report.id.slice(0, 8).toUpperCase()}</Text>
          <Text>生成日期：{new Date(report.ready_at).toLocaleDateString('zh-CN')}</Text>
        </View>
      </Page>

      {/* 7 章正文 */}
      {Object.entries(sections).map(([id, sec]: any) => (
        <Page size="A4" style={styles.page} key={id}>
          <Text style={styles.chapterTitle}>{sec.title}</Text>
          {sec.text.split('\n\n').map((p: string, i: number) => (
            <Text style={styles.paragraph} key={i}>{p}</Text>
          ))}
        </Page>
      ))}

      {/* 附录 + 免责声明 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.chapterTitle}>附录 A · 命盘原始数据</Text>
        <Text style={styles.paragraph}>{formatChartAppendix(chartData)}</Text>
        <View style={styles.disclaimer}>
          <Text>本报告基于传统命理研究，仅供文化参考与个人探索，不构成医疗、法律、财务、投资或心理咨询建议。</Text>
          <Text style={{ marginTop: 8 }}>This report is based on traditional Chinese metaphysics for educational and entertainment purposes only. It does not constitute medical, legal, financial, or psychological advice.</Text>
        </View>
      </Page>
    </Document>
  )
}

function maskName(n: string): string {
  if (!n) return '***'
  return n[0] + '*'.repeat(Math.max(1, n.length - 1))
}
function formatBirth(d: any): string {
  return `${d.solar} | ${d.lunar} | ${d.timezone}`
}
function formatChartAppendix(c: any): string {
  // TODO: 格式化四柱 + 神煞 + 大运表
  return JSON.stringify(c, null, 2).slice(0, 2000)
}
```

### 14.6 前端 PDF 进度页 (`src/pages/ReportPendingPage.tsx`)

```tsx
// 关键逻辑：Realtime 订阅 reports 行变化，进度 100% 自动跳转
const channel = supabase.channel(`report-${reportId}`)
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'reports',
    filter: `id=eq.${reportId}`,
  }, (payload) => {
    setProgress(payload.new.progress)
    if (payload.new.status === 'ready') navigate(`/reports/${reportId}`)
    if (payload.new.status === 'failed') setError(payload.new.error_message)
    if (payload.new.status === 'refunded') {
      setStatus('refunded')   // 显示「已退款」
    }
  }).subscribe()

return (
  <div>
    <h2>详批生成中</h2>
    <ProgressBar value={progress} />
    <p>预计 1-2 分钟，生成完成会发送邮件通知。您可以离开此页面。</p>
  </div>
)
```

### 14.7 字体子集化（CI 脚本）

```bash
#!/usr/bin/env bash
# scripts/build-font-subset.sh

# 1. 下载 Noto Sans SC 完整字体（~17MB）
curl -L -o /tmp/NotoSansSC-Regular.otf \
  https://fonts.gstatic.com/s/notosanssc/v36/NotoSansSC-Regular.otf

# 2. 用 fonttools 子集化（保留常用 3000 汉字 + 标点 ASCII）
pip install fonttools brotli --quiet
pyftsubset /tmp/NotoSansSC-Regular.otf \
  --text-file=scripts/common-chinese-3000.txt \
  --output-file=supabase/functions/report-generate/assets/NotoSansSC-Subset.ttf

# 3. 验证大小
ls -lh supabase/functions/report-generate/assets/NotoSansSC-Subset.ttf
# 期望 ~800KB
```

### 14.8 §11 验收清单补充

加入以下 PDF 相关 DoD 行：

| Task | DoD |
|------|-----|
| PDF Edge Function | curl 触发 `/report-generate` 成功 → reports.status 流转 paid→generating→ready；progress 实时 0-100；耗时 < 120s |
| PDF 渲染 | A4 12-16 页；中文字体正常；命盘附录 + 章节齐全；Lighthouse-PDF / Adobe Reader 打开无错 |
| PDF 异步触发 | Stripe Webhook 接收 → 1s 内插入 reports 行 + 立即调用 report-generate |
| PDF 失败兜底 | 强制让 LLM 返回 5xx 测试 → 自动 fallback；超 24h failed → 自动退款；用户收到道歉邮件 |
| Resend 邮件 | 生成完成邮件 1 分钟内送达；包含签名 URL；URL 24h 内可下载，超时返回 403 |
| Realtime 进度 | 前端 Realtime 订阅生效；进度条 0→100 平滑；status='ready' 自动跳转 |

---

## 15. 客服 / 工单数据模型与 admin 工具

> 对应 PLAN §14 客服 SOP。Sprint 1 用最简方案（一张表 + 一个 admin 页 + Gmail），Sprint 2+ 再上专业工具。

### 15.1 support_tickets 表 DDL

```sql
-- =================== 7. support_tickets ===================
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete set null,    -- 允许删用户但留工单审计
  -- 渠道与分类
  channel text not null check (channel in ('email','in_app','chat')),
  category text not null check (category in (
    'reading_inaccurate',     -- AI 解读不准 / 幻觉
    'unhappy_result',         -- 不喜欢命理结果
    'pdf_failed',             -- PDF 生成失败 / 慢
    'payment_issue',          -- 订阅 / 支付
    'refund_request',         -- 退款申请
    'legal_regulatory',       -- 法律 / 监管 / Apple Legal
    'abuse_threat',           -- 恶意 / 威胁
    'other'
  )),
  priority smallint default 3 check (priority between 1 and 5),  -- 1=最高，5=最低
  -- 状态机
  status text default 'open' check (status in ('open','in_progress','replied','closed','escalated')),
  -- 内容
  subject text not null,
  initial_body text not null,                              -- 用户首次邮件原文
  replies jsonb default '[]'::jsonb,                       -- [{ from, at, body, attachments }]
  internal_notes text,                                     -- 内部备注（不回用户）
  -- 关联业务对象（可选）
  related_reading_id uuid references readings on delete set null,
  related_report_id uuid references reports on delete set null,
  related_subscription_id text,                            -- stripe_subscription_id
  -- 退款追溯
  refund_id text,                                          -- Stripe refund_id（若有）
  refund_amount_usd numeric(10,2),
  -- 时间戳
  created_at timestamptz default now(),
  first_reply_at timestamptz,                              -- SLA 监控
  closed_at timestamptz,
  -- 客服归属
  assigned_to text                                         -- 'you@yourdomain.com'，单兵阶段固定
);

create index tickets_status on support_tickets (status) where status in ('open','in_progress','escalated');
create index tickets_priority on support_tickets (priority, created_at) where status != 'closed';
create index tickets_user on support_tickets (user_id, created_at desc);
create index tickets_category on support_tickets (category, created_at desc);

-- RLS：用户只能看自己的工单（in-app 反馈用），完整管理走 service_role
alter table support_tickets enable row level security;
create policy "read own tickets" on support_tickets
  for select using (auth.uid() = user_id);
create policy "create own tickets" on support_tickets
  for insert with check (auth.uid() = user_id);
```

### 15.2 SLA 监控视图

```sql
-- 用于 PostHog / 内部监控告警
create view ticket_sla_metrics as
select
  date_trunc('day', created_at) as day,
  count(*) as total,
  count(*) filter (where first_reply_at is not null
    and first_reply_at - created_at <= interval '24 hours') * 100.0 / nullif(count(*), 0) as first_reply_24h_pct,
  count(*) filter (where status = 'closed'
    and closed_at - created_at <= interval '72 hours') * 100.0
    / nullif(count(*) filter (where status = 'closed'), 0) as close_72h_pct,
  count(*) filter (where status = 'escalated') as escalated_count,
  count(*) filter (where category = 'legal_regulatory') as legal_count
from support_tickets
where created_at >= now() - interval '30 days'
group by 1
order by 1 desc;
```

### 15.3 邮件入口：Resend Inbound Webhook（Sprint 2 可选）

Sprint 1 用 Gmail 手动 forward → 自己填表（成本 0，可接受）。
Sprint 2+ 用 Resend Inbound Email API 自动入库：

```typescript
// supabase/functions/inbound-email/index.ts（Sprint 2）
serve(async (req) => {
  const event = await req.json()
  if (event.type !== 'email.received') return new Response('ignored')

  const email = event.data
  // 通过 from 邮箱反查 user
  const { data: profile } = await supabase.from('profiles')
    .select('id').ilike('email', email.from).single()

  // 简单分类（基于 subject 关键词，准确率不高但够用）
  const category = classifyByKeywords(email.subject + ' ' + email.body)

  await supabase.from('support_tickets').insert({
    user_id: profile?.id,
    channel: 'email',
    category,
    priority: category === 'legal_regulatory' ? 1 : 3,
    subject: email.subject,
    initial_body: email.body,
  })

  return new Response('ok')
})

function classifyByKeywords(text: string): string {
  const t = text.toLowerCase()
  if (/refund|退款|退钱/.test(t)) return 'refund_request'
  if (/不准|错|inaccurate|wrong/.test(t)) return 'reading_inaccurate'
  if (/pdf|报告|生成失败/.test(t)) return 'pdf_failed'
  if (/credit card|payment|支付|账单/.test(t)) return 'payment_issue'
  if (/lawyer|legal|gdpr|ftc|apple legal/.test(t)) return 'legal_regulatory'
  if (/threat|sue|kill/.test(t)) return 'abuse_threat'
  return 'other'
}
```

### 15.4 单兵 admin 页（Sprint 1 必备）

最小可用路径：`/admin/tickets`，仅 `profiles.is_admin = true` 可访问。

`src/pages/admin/TicketsPage.tsx` 核心字段：

```tsx
// 列表视图：按 priority + created_at 排序
const { data: tickets } = await supabase
  .from('support_tickets')
  .select(`*, profiles(email, display_name), readings(scene, response), reports(type, status, amount_usd)`)
  .neq('status', 'closed')
  .order('priority', { ascending: true })
  .order('created_at', { ascending: false })
  .limit(50)

// 单工单页提供操作按钮：
// - 一键回复（嵌入 Resend 发送 + 写 replies jsonb + 设 first_reply_at）
// - 一键退款（调 Stripe Refund API + 写 refund_id）
// - 一键升级（status='escalated' + priority=1）
// - 一键关闭（status='closed' + closed_at=now）
// - 一键打开关联对象（reading / report / subscription）
```

`profiles` 表加管理员标志：

```sql
alter table profiles add column is_admin boolean default false;
-- 只手动给自己开： update profiles set is_admin = true where email = 'you@yourdomain.com';
```

admin 页 RLS 用专门策略：

```sql
create policy "admin can read all tickets" on support_tickets
  for select using (
    exists(select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "admin can update all tickets" on support_tickets
  for update using (
    exists(select 1 from profiles where id = auth.uid() and is_admin = true)
  );
```

### 15.5 客服回复 Edge Function (`supabase/functions/ticket-reply/`)

```typescript
// 接受 admin 页提交的回复，统一发邮件 + 落库 replies + 更新 SLA 时间戳
serve(async (req) => {
  const { ticket_id, reply_body, refund_amount } = await req.json()
  // 1. 校验 admin
  // 2. （可选）调 Stripe Refund
  // 3. 调 Resend 发邮件给 user
  // 4. update support_tickets：
  //    - replies = replies || [{ from: 'support', at: now, body: reply_body }]
  //    - first_reply_at = coalesce(first_reply_at, now)
  //    - status = 'replied'
  //    - refund_id, refund_amount_usd（若有）
})
```

### 15.6 §11 验收清单补充

| Task | DoD |
|------|-----|
| 工单系统 | 用户在 in-app 提交反馈 → tickets 表落行；admin 页能看到；SLA 视图有数据 |
| 客服回复 | admin 页发送回复 → Resend 邮件送达；first_reply_at 写入；replies jsonb 增长 |
| 退款联动 | 在 admin 页点"退款 + 回复"→ Stripe 实际退款 + 邮件通知 + tickets.refund_id 写入 |
| SLA 告警 | 24h 未首响工单 ≥ 1 → 触发邮件给 admin（cron Edge Function 每小时跑） |

---

## 16. 数据保护 / 隐私合规实现

> 对应 PLAN §15。Sprint 1 上线前必须就位（Apple 提审 + GDPR + Stripe 合规硬要求）。

### 16.1 schema 改造

```sql
-- 安装加密扩展（Supabase 默认开启 pgcrypto）
create extension if not exists pgcrypto;

-- profiles：状态机 + 删除调度 + Cookie 同意
alter table profiles add column status text default 'active'
  check (status in ('active','paused','pending_deletion'));
alter table profiles add column scheduled_delete_at timestamptz;
alter table profiles add column consent jsonb default '{}'::jsonb;
-- 例: { "necessary": true, "analytics": false, "errors": false, "marketing": false, "agreed_at": "2026-04-30T..." }
alter table profiles add column birth_year_only smallint;     -- 仅存出生年（年龄校验用），不存生日
alter table profiles add column age_confirmed_16 boolean default false;

-- charts.input_data 中加密字段（应用层 AES-GCM）
-- 不改表结构，但写入约定：
--   input_data.birth_time_enc  → base64 加密字符串
--   input_data.birth_place_enc → base64 加密字符串
--   input_data.timezone        → 明文（计算需要）
--   input_data.solar_year/month/day → 明文（命盘衍生需要，但精度仅到日）
--   ⚠️ 不要在 input_data 里同时存明文 birth_time

-- readings.question 应用层加密
alter table readings add column question_enc text;
-- 兼容期保留 question 字段，迁移完成后 drop

-- 索引：cron 用
create index profiles_scheduled_delete on profiles (scheduled_delete_at)
  where status = 'pending_deletion';

-- incidents log（PLAN §15.10 数据泄露记录）
create table incidents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('breach','suspected','near_miss','3rd_party_alert')),
  severity text not null check (severity in ('critical','high','medium','low')),
  detected_at timestamptz not null,
  description text not null,
  affected_user_count int,
  notified_dpa_at timestamptz,                -- 通知监管机构时间
  notified_users_at timestamptz,              -- 通知用户时间
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);
```

### 16.2 应用层加密 (`_shared/crypto.ts`)

```typescript
// supabase/functions/_shared/crypto.ts
// AES-256-GCM 应用层加密
// 密钥来自 Edge Function Secret，前端永远拿不到

const KEY_PROMISE = (async () => {
  const raw = Uint8Array.from(atob(Deno.env.get('PII_ENCRYPTION_KEY')!), c => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  )
})()

const KEY_VERSION = parseInt(Deno.env.get('PII_KEY_VERSION') ?? '1')

export async function encryptPII(plain: string): Promise<string> {
  const key = await KEY_PROMISE
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plain)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  // 格式：v{version}:base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + new Uint8Array(ct).length)
  combined.set(iv); combined.set(new Uint8Array(ct), iv.length)
  return `v${KEY_VERSION}:${btoa(String.fromCharCode(...combined))}`
}

export async function decryptPII(payload: string): Promise<string> {
  // 兼容多版本密钥（轮换期）
  const m = payload.match(/^v(\d+):(.+)$/)
  if (!m) throw new Error('invalid_pii_format')
  const version = parseInt(m[1])
  const key = await getKeyForVersion(version)

  const buf = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0))
  const iv = buf.slice(0, 12)
  const data = buf.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plain)
}

async function getKeyForVersion(v: number): Promise<CryptoKey> {
  if (v === KEY_VERSION) return await KEY_PROMISE
  // 轮换期支持读取旧 key（环境变量 PII_ENCRYPTION_KEY_V1 等）
  const oldRaw = Deno.env.get(`PII_ENCRYPTION_KEY_V${v}`)
  if (!oldRaw) throw new Error(`unknown_pii_key_version: ${v}`)
  const raw = Uint8Array.from(atob(oldRaw), c => c.charCodeAt(0))
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
}
```

环境变量加（更新 §1.4）：
```bash
PII_ENCRYPTION_KEY=<base64 32 bytes random>     # 当前 key
PII_KEY_VERSION=1                                # 当前版本号
# 轮换期：
# PII_ENCRYPTION_KEY_V1=<旧 key，用于解读历史数据>
```

### 16.3 数据导出 Edge Function (`/data-export`)

GDPR Art. 15 + Art. 20。

```typescript
// supabase/functions/data-export/index.ts
import { decryptPII } from '../_shared/crypto.ts'

serve(async (req) => {
  const user = await getAuthUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  const [profile, charts, readings, reports, subs, tickets] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('charts').select('*').eq('user_id', user.id),
    supabase.from('readings').select('*').eq('user_id', user.id),
    supabase.from('reports').select('id,type,status,paid_at,amount_usd,ready_at,user_rating,user_feedback').eq('user_id', user.id),
    supabase.from('subscriptions').select('*').eq('user_id', user.id),
    supabase.from('support_tickets').select('*').eq('user_id', user.id),
  ])

  // 解密 PII
  const decryptedCharts = await Promise.all(
    (charts.data ?? []).map(async c => ({
      ...c,
      input_data: {
        ...c.input_data,
        birth_time: c.input_data.birth_time_enc
          ? await decryptPII(c.input_data.birth_time_enc) : null,
        birth_place: c.input_data.birth_place_enc
          ? await decryptPII(c.input_data.birth_place_enc) : null,
      }
    }))
  )

  const decryptedReadings = await Promise.all(
    (readings.data ?? []).map(async r => ({
      ...r,
      question: r.question_enc ? await decryptPII(r.question_enc) : r.question,
    }))
  )

  const exportData = {
    exported_at: new Date().toISOString(),
    legal_notice: 'Personal data export per GDPR Art. 15. Retain at your discretion.',
    user: profile.data,
    charts: decryptedCharts,
    readings: decryptedReadings,
    reports: reports.data,
    subscriptions: subs.data,
    support_tickets: tickets.data,
  }

  // 简化版（< 5MB）：直接返回 JSON
  // 大数据量版：上传到 Storage signed URL（24h），邮件发送下载链接
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="my-data-${user.id.slice(0, 8)}-${Date.now()}.json"`,
    }
  })
})
```

### 16.4 账号注销 Edge Function (`/account-delete`)

GDPR Art. 17。

```typescript
// supabase/functions/account-delete/index.ts
import Stripe from 'npm:stripe@17.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

serve(async (req) => {
  const user = await getAuthUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)
  const { confirm } = await req.json()
  if (!confirm) return json({ error: 'confirmation_required' }, 400)

  // 1. 立即取消所有活跃订阅（不再收续费，立即生效）
  const { data: sub } = await supabase.from('subscriptions')
    .select('stripe_subscription_id, status').eq('user_id', user.id).single()
  if (sub?.stripe_subscription_id && sub.status === 'active') {
    await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
      invoice_now: false, prorate: false,
    })
  }

  // 2. 标记 pending_deletion + 30 天后到期
  const scheduledDeleteAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString()
  await supabase.from('profiles').update({
    status: 'pending_deletion',
    scheduled_delete_at: scheduledDeleteAt,
  }).eq('id', user.id)

  // 3. 强制 sign out 当前 session（其他设备同步）
  await supabase.auth.admin.signOut(user.id, 'global')

  // 4. 发邮件确认（含恢复链接）
  await resend.emails.send({
    from: 'support@yourdomain.com',
    to: user.email!,
    subject: '账号注销请求已收到',
    html: `
      <p>您的账号将在 ${new Date(scheduledDeleteAt).toLocaleDateString('zh-CN')} 永久删除。</p>
      <p>30 天内重新登录可自动恢复。如非本人操作，请立即<a href="${Deno.env.get('APP_URL')}/account/cancel-deletion?token=...">取消注销</a>。</p>
      <p>注销后将永久删除：所有命盘 / 解读历史 / PDF 报告 / 工单。</p>
      <p>财务记录（订阅 / 退款）将匿名化保留 7 年（税务合规要求）。</p>
    `
  })

  return json({ ok: true, scheduled_delete_at: scheduledDeleteAt })
})
```

### 16.5 计划清理 cron (`/scheduled-purge`)

每天 03:00 UTC 跑一次。Supabase 配置 cron 或用 GitHub Actions 触发。

```typescript
// supabase/functions/scheduled-purge/index.ts
serve(async (req) => {
  // 只允许 service_role 调用（cron header 校验）
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('forbidden', { status: 403 })
  }

  const { data: toDelete } = await supabase.from('profiles')
    .select('id, email')
    .eq('status', 'pending_deletion')
    .lte('scheduled_delete_at', new Date().toISOString())

  let purgedCount = 0
  for (const profile of toDelete ?? []) {
    try {
      // 1. 匿名化财务记录（保留 7 年合规）
      await supabase.from('subscriptions').update({
        user_id: null, raw: null   // 保留 stripe_*，仅断 user_id 关联
      }).eq('user_id', profile.id)

      await supabase.from('reports').update({
        user_id: null, sections: null, pdf_url: null   // PDF 文件单独删
      }).eq('user_id', profile.id)

      // 2. 删除 Storage 中的 PDF 文件
      const { data: pdfs } = await supabase.storage
        .from(Deno.env.get('SUPABASE_STORAGE_BUCKET_REPORTS')!)
        .list(profile.id)
      if (pdfs?.length) {
        await supabase.storage
          .from(Deno.env.get('SUPABASE_STORAGE_BUCKET_REPORTS')!)
          .remove(pdfs.map(p => `${profile.id}/${p.name}`))
      }

      // 3. 硬删 profiles（CASCADE 触发删 charts / readings / tickets）
      await supabase.from('profiles').delete().eq('id', profile.id)

      // 4. 删除 auth.users
      await supabase.auth.admin.deleteUser(profile.id)

      purgedCount++
      console.log(`[purge] deleted user ${profile.id}`)
    } catch (e) {
      console.error(`[purge] failed for ${profile.id}:`, e)
      // 记录到 incidents 表，不阻塞其他用户
      await supabase.from('incidents').insert({
        type: 'near_miss', severity: 'medium',
        detected_at: new Date().toISOString(),
        description: `scheduled_purge failed for user ${profile.id}: ${e}`,
      })
    }
  }

  return new Response(JSON.stringify({ purged: purgedCount }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 16.6 DeepSeek PII 脱敏（Free 档专用）

```typescript
// supabase/functions/_shared/pii-sanitize.ts

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[一-龥]{2,4}(?:先生|女士|老师|总|经理|教授|医生)/g, 'name_with_title'],
  [/[\w.-]+@[\w.-]+\.\w+/g, 'email'],
  [/1[3-9]\d{9}/g, 'cn_phone'],
  [/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, 'na_phone'],
  [/\d{17}[\dXx]/g, 'cn_id_card'],
  [/\d{3}-\d{2}-\d{4}/g, 'us_ssn'],
  [/[一-龥\w]{2,10}(?:公司|集团|有限|株式会社)/g, 'company_cn'],
  [/\b\w{2,30}\s+(?:Inc|LLC|Ltd|Corp|Corporation)\b/g, 'company_en'],
  [/(?:位于|住在|来自|live(?:s)?\s+in|from)\s*[一-龥\w]+/gi, 'location'],
]

export type PIIDetection = { hasPII: boolean; matches: Array<{ type: string; sample: string }> }

export function detectPII(text: string): PIIDetection {
  const matches: PIIDetection['matches'] = []
  for (const [re, type] of PII_PATTERNS) {
    const found = text.match(re)
    if (found) {
      for (const m of found) {
        matches.push({ type, sample: m.slice(0, 20) + (m.length > 20 ? '...' : '') })
      }
    }
  }
  return { hasPII: matches.length > 0, matches }
}

// reading/index.ts 调用 LLM 前
// （在 §4.5 callLLMStream 之前插入）
const tier = getTierFromUser(user)
if (TIER_ROUTE[tier].provider === 'deepseek') {
  const detection = detectPII(question)
  if (detection.hasPII) {
    return json({
      error: 'pii_detected',
      detected_types: detection.matches.map(m => m.type),
      message: '免费档不支持包含个人信息的问题（涉及隐私保护）。请升级 Plus（GPT-4.1）以获得更全面的解读，或修改问题去除个人信息。',
      upgrade_url: '/upgrade',
    }, 400)
  }
}
```

### 16.7 Cookie Consent UI (`src/components/CookieConsent.tsx`)

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../api/client'
import { useTranslation } from 'react-i18next'

type Consent = {
  necessary: boolean
  analytics: boolean
  errors: boolean
  marketing?: boolean
  agreed_at?: string
}

export function CookieConsent() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState<Consent>({ necessary: true, analytics: false, errors: false })

  useEffect(() => {
    if (!localStorage.getItem('consent_v1')) setShow(true)
  }, [])

  async function save(consent: Consent) {
    const final: Consent = { ...consent, agreed_at: new Date().toISOString() }
    localStorage.setItem('consent_v1', JSON.stringify(final))

    // 同步到 profile（已登录用户）
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ consent: final }).eq('id', user.id)

    // 启用第三方（仅当同意）
    if (final.analytics) {
      const ph = (await import('posthog-js')).default
      ph.opt_in_capturing()
    }
    if (final.errors) {
      const Sentry = await import('@sentry/react')
      Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-4 z-50">
      <p className="text-sm">
        {t('cookie.intro')} <a href="/privacy" className="underline">{t('cookie.policy')}</a>
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => save({ necessary: true, analytics: true, errors: true })}
                className="bg-black text-white px-4 py-2 rounded">{t('cookie.accept_all')}</button>
        <button onClick={() => save({ necessary: true, analytics: false, errors: false })}
                className="border px-4 py-2 rounded">{t('cookie.necessary_only')}</button>
        <button onClick={() => setCustomOpen(true)}
                className="border px-4 py-2 rounded">{t('cookie.customize')}</button>
      </div>
      {customOpen && (
        <div className="mt-3 border-t pt-3">
          <label className="block"><input type="checkbox" checked disabled /> {t('cookie.necessary')} ({t('cookie.required')})</label>
          <label className="block"><input type="checkbox" checked={custom.analytics}
            onChange={e => setCustom({ ...custom, analytics: e.target.checked })} /> {t('cookie.analytics')} (PostHog)</label>
          <label className="block"><input type="checkbox" checked={custom.errors}
            onChange={e => setCustom({ ...custom, errors: e.target.checked })} /> {t('cookie.errors')} (Sentry)</label>
          <button onClick={() => save(custom)} className="mt-2 bg-black text-white px-4 py-2 rounded">{t('cookie.save')}</button>
        </div>
      )}
    </div>
  )
}
```

### 16.8 Sentry / PostHog PII 防泄漏配置

```typescript
// src/main.tsx Sentry 配置
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 删除可能的 PII
    if (event.request?.headers) {
      delete event.request.headers['Authorization']
      delete event.request.headers['Cookie']
    }
    // 邮箱脱敏
    if (event.user?.email) {
      event.user.email = event.user.email.replace(/(.).+(@.+)/, '$1***$2')
    }
    return event
  },
  // 关闭 IP / device 默认采集
  sendDefaultPii: false,
})

// PostHog
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  // 关闭设备追踪
  disable_session_recording: true,
  disable_persistence: false,
  ip: false,                                  // 不收集 IP
  property_blacklist: ['$ip', '$initial_referrer'],  // 全局 properties 黑名单
  // user opt-in
  opt_out_capturing_by_default: true,         // 默认不采集，等同意后启用
})
```

### 16.9 §11 验收清单补充

| Task | DoD |
|------|-----|
| PII 加密 | birth_time / birth_place / question 在 DB 直接 `select` 看到的是 `v1:base64...` 不是明文 |
| 数据导出 | 用户点"导出我的数据" → JSON 下载，含 6 类完整数据 + 解密后明文 |
| 账号注销 | 注销 → 立即停 Stripe 订阅 + status='pending_deletion' + 30 天后 cron 硬删 |
| Cookie 同意 | 首访横幅；默认拒绝 PostHog/Sentry；接受后才启用 |
| DeepSeek 脱敏 | Free 档 question 含手机号/邮箱 → 拒绝调用 + 提示升级 |
| 隐私政策 URL | `/privacy` 静态页可访问；含 PLAN §15.9 全部 10 条 |
| Sentry/PostHog 脱敏 | 错误事件不含明文邮箱；PostHog 事件不含 IP |
| 密钥轮换 | PII_KEY_VERSION 升级后老数据仍可解密；新数据用新版 |
| Incidents 记录 | scheduled-purge 失败 → incidents 表落行 |
