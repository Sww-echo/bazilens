# Privacy & PII Guidelines

> 命理产品的 PII 比普通 SaaS 敏感（出生时间能定位人）。源：PLAN §15 + TECH_SPEC §16。

---

## PII 分级（任何写代码前先确认数据级别）

| 字段 | 等级 | 处理 |
|------|------|------|
| `auth.users.email` | Medium | Supabase 磁盘加密足够 |
| `profiles.display_name` | Low | 同上 |
| **`charts.input_data.birth_time`** | **High** | 应用层 AES 加密（`_shared/crypto.ts`），存为 `birth_time_enc` |
| **`charts.input_data.birth_place`** | **High** | 同上 |
| `charts.chart_data` | Low | 衍生数据，不可逆推 |
| **`readings.question`** | **High** | 应用层 AES，存为 `question_enc` |
| `readings.response` | Medium | 磁盘加密 |
| `reports.sections` / `pdf_url` | High | Storage 私有 bucket + signed URL |

---

## Three Hard Rules（违反就是事故）

### 1. PII 不发 DeepSeek

DeepSeek 数据驻留中国。Free 档 `reading/index.ts` 调用前：

```typescript
import { detectPII } from '../_shared/pii-sanitize.ts'

if (TIER_ROUTE[tier].provider === 'deepseek') {
  const detection = detectPII(question)
  if (detection.hasPII) return json({ error: 'pii_detected' }, 400)
}
```

命盘干支不算 PII（衍生计算），可以发送。

### 2. 加密存储 birth_time / birth_place / question

写入路径必须经 `_shared/crypto.ts`：

```typescript
import { encryptPII } from '../_shared/crypto.ts'

const enc_input = {
  ...input_data,
  birth_time_enc: await encryptPII(input_data.birth_time),
  birth_place_enc: await encryptPII(input_data.birth_place),
}
delete enc_input.birth_time      // 明文必须清理
delete enc_input.birth_place
```

读取路径只在 Edge Function 内解密，**绝不传到前端**（前端只看排盘 chart_data）。

### 3. Sentry / PostHog 不传 PII

```typescript
// Sentry beforeSend 必装
beforeSend(event) {
  if (event.user?.email) {
    event.user.email = event.user.email.replace(/(.).+(@.+)/, '$1***$2')
  }
  delete event.request?.headers?.['Authorization']
  delete event.request?.headers?.['Cookie']
  return event
}

// PostHog 全局 properties 黑名单
posthog.init(KEY, {
  property_blacklist: ['$ip', '$initial_referrer'],
  ip: false,
  opt_out_capturing_by_default: true,    // 用户同意才采集
})
```

事件 properties 永远不写 `birth_time` / `email` / `question` 明文。

---

## GDPR 6 项权利对应

| 权利 | 实现 |
|------|------|
| Art. 15 数据访问 | Edge Function `/data-export`（解密所有 PII 返回 JSON） |
| Art. 16 更正 | profile 编辑页（自助） |
| Art. 17 删除 | `/account-delete` → 30 天 grace → cron `/scheduled-purge` 硬删 |
| Art. 18 限制处理 | profile.status='paused' |
| Art. 20 数据可携 | 同 Art. 15 |
| Art. 21 反对营销 | Resend unsubscribe header |

---

## 注销流程（不可改）

```
用户点击「注销账号」
  ↓
profiles.status = 'pending_deletion'
profiles.scheduled_delete_at = now() + 30 days
立即取消 Stripe 订阅（不再收费）
全设备 sign out
邮件确认（含恢复链接）
  ↓
30 天内重新登录可恢复（status 改回 active）
  ↓
30 天后 cron 触发硬删：
  - 删 Storage 中的 PDF
  - profiles delete CASCADE → 删 charts / readings / tickets
  - subscriptions / reports 仅断 user_id 关联（保留 stripe_*  7 年合规）
  - auth.users.delete()
```

---

## 密钥管理

| 密钥 | 来源 | 轮换 |
|------|------|------|
| `PII_ENCRYPTION_KEY` | Supabase Secret | 12 月 / 怀疑泄露立即 |
| `PII_KEY_VERSION` | 同上 | 升版后用 `PII_ENCRYPTION_KEY_V<n>` 兼容旧数据 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 自带 | 6 月 |
| Stripe / Anthropic / OpenAI / DeepSeek API key | 各自 dashboard | 12 月 |

**绝不**：
- 把任何密钥提交到 git（`.gitignore` 含 `.env*`）
- 在前端 env 暴露 service_role / API key（只放 ANON_KEY）
- 在 Sentry / 日志输出密钥

---

## Cookie 同意

GDPR 默认 opt-in。`<CookieConsent />` 组件三档：
- 必要：Auth Session（默认开）
- 性能：PostHog（默认关）
- 错误：Sentry（默认关）

PostHog / Sentry 在用户明确同意后才 `init()`。

---

## 应急：数据泄露（GDPR Art. 33-34）

| 阶段 | 时限 | 动作 |
|------|------|------|
| 检测 | 立即 | 启动 incident response |
| 通知 DPA | < 72h | 邮件给监管机构 |
| 通知用户 | 「高风险」时 | in-app + 邮件 |
| 内部记录 | 永久 | `incidents` 表 |

触发：service_role_key 泄露 / Supabase 安全告警 / AI 输出 cross-contamination / 服务方通报。
