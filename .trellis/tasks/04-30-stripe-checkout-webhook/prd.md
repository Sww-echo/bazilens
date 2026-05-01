# Stripe Checkout + Webhook (Subscription + PDF)

## Goal

打通 Stripe 双轨支付：订阅（plus / pro × monthly / yearly）+ 一次性 PDF（$14.99）。Checkout 创建会话、webhook 处理付款事件并触发后续动作（PDF 立即触发 report-generate）。

> 详见 `docs/TECH_SPEC.md` §10 + `.trellis/spec/guides/sprint-roadmap.md`。

---

## Scope

### In Scope

1. **`supabase/functions/checkout/index.ts`**
   - [x] POST 入参：`{ kind: 'subscription' | 'pdf', lookup_key: string, chart_id?: string }`
   - [x] `lookup_key` 反查 Stripe Price（`plus_monthly` / `plus_yearly` / `pro_monthly` / `pro_yearly` / `pdf_full_bazi`）
   - [x] Subscription mode：`subscription` + 14 天免费试用（如 PLAN 决定）
   - [x] PDF mode：`payment` 一次性，metadata 携带 `chart_id` + `user_id` 供 webhook 使用
   - [x] 返 `{ url }` 给前端跳转
   - [x] `openCustomerPortal()` 辅助 endpoint：调 Stripe Billing Portal session

2. **`supabase/functions/stripe-webhook/index.ts`**（219 行）
   - [x] 验签：`stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET`
   - [x] 事件分发：
     - `checkout.session.completed` → 区分 subscription / payment 模式
       - subscription：upsert `subscriptions` 行（tier / status / period_end）
       - payment：insert `reports` 行（type='full_bazi' / status='paid'）+ 触发 `report-generate`（fetch invoke）
     - `customer.subscription.updated` → 同步 status / period_end
     - `customer.subscription.deleted` → status='canceled' + downgrade tier='free' on period_end
     - `invoice.payment_failed` → status='past_due'
     - `charge.refunded` → mark `reports.refund_amount_usd` 或 `subscriptions.refund_at`
   - [x] 幂等：用 `event.id` 写 `webhook_events` 表（如 spec 要求）

### Out of Scope

- ❌ Stripe Products / Prices 创建（用户在 Stripe Dashboard 手动建 + 标 lookup_key）
- ❌ PDF 实际生成（在 `04-30-pdf-report-generate`）

---

## DoD

- [x] `supabase/functions/checkout/index.ts` 存在
- [x] `supabase/functions/stripe-webhook/index.ts` 存在并验签
- [x] 双 mode（subscription + pdf）路径都覆盖
- [x] webhook 处理 5 个核心事件类型
- [x] PDF 路径会触发 `report-generate` Edge Function（HTTP fetch）
- [x] 失败 / 退款事件正确更新 DB

---

## Key References

- `docs/TECH_SPEC.md` §10（Stripe 集成）
- `.trellis/spec/supabase/edge-functions.md`「checkout」「stripe-webhook」
- `src/api/subscriptions.ts`（前端消费方）

---

## Notes

- 实现完成于 commit `b451592`。
- 价格 lookup_keys 列表见 `STATUS.md` "Pending — needs user action"，需用户在 Stripe 后台对应建。
- 前端 `UpgradePage` + `UpgradeModal` 已通过 `startSubscriptionCheckout(lookup_key)` 接入。
- 退款政策由 `04-30-privacy-compliance` 任务的 SOP 配套（`.trellis/spec/guides/customer-support.md`）。
