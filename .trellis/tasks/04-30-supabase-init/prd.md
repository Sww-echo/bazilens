# Initialize Supabase Project and Migrations

## Goal

为 BaziLens 搭起 Supabase 后端骨架：本地 `supabase` 目录、Auth/OAuth 配置、4 个核心 migration、`reports` Storage bucket、prompt_versions 种子数据。

> 详见 `.trellis/spec/supabase/index.md` + `.trellis/spec/supabase/migrations.md`。

---

## Scope

### In Scope

1. **`supabase/config.toml`**
   - [x] Auth（magic link + Google + Apple OAuth providers）
   - [x] Storage（`reports` private bucket）
   - [x] Edge runtime 配置

2. **Migrations（按依赖顺序）**
   - [x] `0001_init.sql` — 7 张核心表 + RLS：
     - `profiles` (extends `auth.users`)
     - `charts` (input_meta jsonb + chart_data jsonb + encrypted PII columns)
     - `readings` (scene + status + model + quality_score + rating)
     - `usage_quotas` (period_start + readings_used + pdf_reports_used)
     - `subscriptions` (tier + status + stripe_subscription_id + period_end)
     - `reports` (type + status + progress + amount_usd + storage_path)
     - `prompt_versions` (template + variables_schema)
     - `handle_new_user()` trigger 自动建 profile + 0 配额
   - [x] `0002_quota_rpc.sql` — `consume_reading_quota()` / `rollback_reading_quota()` / `consume_pdf_quota()` SECURITY DEFINER RPC，原子配额扣减
   - [x] `0003_support_tickets.sql` — `support_tickets` 表 + SLA view + RLS（admin via `is_admin()`）
   - [x] `0004_privacy_compliance.sql` — `profiles.status` / `scheduled_delete_at` / `consent` JSON + `incidents` 表 + `auth.users.email` sync trigger

3. **种子数据**
   - [x] `seed.sql` — 创建 `reports` Storage bucket + 7 个 PDF prompt placeholder 行（cover / personality / career / wealth / relationship / health / outlook）

4. **本地工具链**
   - [x] `package.json` 加 `supabase:types` script
   - [x] `src/types/database.types.ts` placeholder（等真 project 起来后用 `supabase gen types` 生成）

### Out of Scope

- ❌ Edge Functions（独立任务）
- ❌ 真实 Supabase project provisioning（需用户手动创建）
- ❌ `supabase secrets set`（需 API key 后做）

---

## DoD

- [x] `supabase/migrations/` 4 个 SQL 文件，按编号顺序执行无报错
- [x] RLS 策略覆盖所有用户表（charts / readings / reports / subscriptions / support_tickets）
- [x] `handle_new_user` trigger 测过：`auth.users` insert 后 `profiles` 自动出现
- [x] `seed.sql` 可单独跑，幂等（`on conflict do nothing`）
- [x] `database.types.ts` placeholder 不导致 typecheck 失败

---

## Key References

- `docs/TECH_SPEC.md` §3-§7（DDL / RLS / 配额 / 订阅）
- `.trellis/spec/supabase/migrations.md`（migration 命名 + 顺序）
- `.trellis/spec/guides/privacy-pii.md`（PII 列加密）

---

## Notes

- 实际 `supabase init` + `supabase link` 仍需用户在自己机器上跑（涉及 access token）。本任务只产出本地文件。
- `0004_privacy_compliance.sql` 引入的 `incidents` 表见 `04-30-privacy-compliance` 任务做的对接。
- 实现已完成于 commit `b451592`（initial）。
