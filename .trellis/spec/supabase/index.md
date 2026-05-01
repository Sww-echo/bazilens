# Supabase Backend Guidelines

> Edge Functions, migrations, and RLS for the BaziLens product.
> Full context: `docs/PLAN.md` (product) and `docs/TECH_SPEC.md` (implementation reference).

---

## Pre-Development Checklist

Before writing any Edge Function or migration:

- [ ] Read `docs/TECH_SPEC.md` §2 (DDL), §3 (quota), §4 / §4.5 (LLM), §6 (Stripe), §14-§16 for the relevant module
- [ ] Confirm RLS policy is defined for any new user-data table
- [ ] Confirm JWT validation runs FIRST in any Edge Function entrypoint
- [ ] Confirm `service_role_key` is NEVER referenced from frontend code
- [ ] PII fields go through `_shared/crypto.ts` encryption (see `privacy-pii.md` guide)
- [ ] LLM calls go through `_shared/llm.ts` (never call providers directly from feature code)

---

## Quality Check

Before committing:

- [ ] `supabase db reset` runs locally without errors
- [ ] `supabase functions serve` boots all functions
- [ ] curl smoke test for the touched endpoint passes
- [ ] No hard-coded secrets / API keys
- [ ] Stripe webhook endpoints validate signature before any DB write
- [ ] Quota deduction uses RPC (atomic), never client `update`

---

## Guidelines Index

| Guide | Description |
|-------|-------------|
| [Edge Functions](./edge-functions.md) | Function structure, error handling, streaming SSE |
| [Migrations & RLS](./migrations.md) | DDL conventions, RLS policy patterns |
| [LLM Routing](./llm-routing.md) | Three-model fallback, prompt cache, cost tracking |
| [Stripe Integration](./stripe.md) | Checkout / Webhook / Customer Portal |
| [PDF Generation](./pdf-generation.md) | report-generate flow, react-pdf, async tasks |

---

## Key Decisions Already Made

These are NOT to be re-debated without explicit user approval:

1. **Three-model routing**: Free=DeepSeek, Plus=GPT-4.1, Pro=Claude Sonnet 4.6 (PLAN §4 + §9)
2. **Pro 200/月 软封顶**：UI 不写 "无限"，避免重度用户拖亏 (PLAN §9.3)
3. **PDF 章节串行 + Anthropic prompt cache**：不并行（rate limit 风险）(PLAN §13.3)
4. **PDF 主路由用 Claude，失败 fallback 到 GPT-4.1**：保证质量 (TECH_SPEC §14.4)
5. **DeepSeek 不发送 PII**：question 通过 `_shared/pii-sanitize.ts` 过滤（TECH_SPEC §16.6）
6. **30 天 grace period 注销**：财务记录匿名化保留 7 年合规 (PLAN §15.6)
7. **Storage 私有 bucket + signed URL 24h**：PDF 不公开访问

---

## Forbidden Patterns

- ❌ 在 Edge Function 内 inline 写 LLM 三分支（必须用 `_shared/llm.ts`）
- ❌ 客户端直接 insert `readings` / `reports`（违反 RLS 设计）
- ❌ 把 service_role_key 暴露到 Vercel public env vars
- ❌ 退款不写 `support_tickets` 关联（破坏审计链）
- ❌ Sentry / PostHog 上传明文 email / birth_time
- ❌ `select *` 而不指定字段（隐私角度，明确取数才能审计）

---

**Language**: spec 内容以中文为主（产品语境），代码注释 / 变量英文。
