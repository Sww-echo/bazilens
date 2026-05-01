# Privacy Compliance (data-export / account-delete / scheduled-purge)

## Goal

满足 GDPR / CCPA 合规要求：用户可导出全部数据（Art. 15）、可注销账号（30 天 grace period）、过期账号自动硬删除（每日 cron）。同时落地 PII 加密 + email sync + consent 存储。

> 详见 `.trellis/spec/guides/privacy-pii.md` + `docs/TECH_SPEC.md` §11 §12.5。

---

## Scope

### In Scope

1. **`supabase/migrations/0004_privacy_compliance.sql`**
   - [x] `profiles.status` enum: `active` / `scheduled_delete` / `deleted`
   - [x] `profiles.scheduled_delete_at` timestamp
   - [x] `profiles.consent` jsonb（cookie consent 镜像 + 接受时间戳）
   - [x] `incidents` 表：事件记录（incident_id / kind / severity / data jsonb / created_at）
   - [x] `auth.users.email` → `profiles.email` sync trigger（注销/换邮箱时同步）

2. **`supabase/functions/data-export/index.ts`**
   - [x] `requireAuth` 用户自助
   - [x] 读取该 user_id 的全部行：profiles / charts / readings / reports / subscriptions / support_tickets / incidents
   - [x] **解密 PII**（charts.birth_time / birth_place）—因为是给本人导
   - [x] 生成 JSON 文件直接 download（attachment header）
   - [x] 写 `incidents` 行：kind='self_export'

3. **`supabase/functions/account-delete/index.ts`**
   - [x] `requireAuth` + body `{ confirm: true }`
   - [x] 检查 active subscription：有则先取消 Stripe（防扣费）
   - [x] `profiles.status='scheduled_delete'` + `scheduled_delete_at = now() + 30 days`
   - [x] `auth.signOut` 全设备
   - [x] Resend 邮件：30 天内可撤销 + 客服联系方式
   - [x] 写 `incidents` 行：kind='account_delete_requested'

4. **`supabase/functions/scheduled-purge/index.ts`**
   - [x] CRON_SECRET 校验（`Authorization: Bearer ${CRON_SECRET}`）
   - [x] 查 `profiles.status='scheduled_delete' AND scheduled_delete_at < now()`
   - [x] 对每个用户：硬删 charts / readings / reports；匿名化 subscriptions（保留 stripe_subscription_id 但清 user_id 用于审计）
   - [x] 删 `auth.users`
   - [x] 保留 `incidents` 行（合规审计）

### Out of Scope

- ❌ pg_cron 调度配置（部署时做，`STATUS.md` 20）
- ❌ Apple App Privacy 信息卡填写（用户在 App Store Connect 做）

---

## DoD

- [x] migration 0004 应用后所有列就位
- [x] `data-export` 返回 JSON 包含解密的 PII（仅本人可见）
- [x] `account-delete` 30 天 grace 正确，可登录撤销（status 检查）
- [x] `scheduled-purge` 幂等（多次运行不重复删）
- [x] 财务行匿名化但不删（防 Stripe reconciliation 失败）
- [x] `incidents` 表全量记录关键合规事件

---

## Key References

- `docs/TECH_SPEC.md` §11（PII 加密 + key 轮换）+ §12.5（GDPR / CCPA）
- `.trellis/spec/guides/privacy-pii.md`
- `.trellis/spec/guides/apple-review.md`
- `src/pages/account/AccountPage.tsx`（前端调用方：Export My Data + Delete Account）

---

## Notes

- 实现完成于 commit `b451592`。
- 30 天 grace period 是行业惯例（GitHub / Stripe 都采用）。
- `incidents` 表 RLS：用户只能看自己的，admin 全见。
- 前端 `AccountPage` 通过 `fetch /functions/v1/data-export` + `account-delete` 直接调用，无需中间 API 层。
- PII key 轮换：`PII_KEY_VERSION` 升号时旧数据用旧 key 解、新写入用新 key 加（`crypto.ts` 头部 `v{N}:` 区分）。
