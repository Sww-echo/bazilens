# Edge Functions Guidelines

> Source: TECH_SPEC §4, §6, §14, §16.

---

## Standard Function Skeleton

```typescript
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, getAuthUser } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })

  // 2. JWT 校验（除 webhooks 外的所有路由必须）
  const user = await getAuthUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  // 3. 业务逻辑 ...
})
```

---

## Streaming SSE (reading endpoint)

`reading/index.ts` 用流式输出。关键点：

- 走 `_shared/llm.ts` 的 `callLLMStream`，回调推 `data: {...}\n\n` 帧
- 三种事件：`{type:'delta',text}` / `{type:'done',reading_id}` / `{type:'error',message}`
- 流结束后才落库（`status='completed'` + tokens + cost）
- fallback 发生时：调 `rollback_reading_quota` + 在 `error_message` 记录降级链
- 客户端中断时（SSE 连接断）：reading 留在 `streaming` 状态，由 cron 1h 后清理

---

## Webhook Signing（Stripe）

Stripe webhook **必须**先验签：

```typescript
const sig = req.headers.get('stripe-signature')!
const body = await req.text()
const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
// 验签失败会 throw → Stripe 收到 400 自动重试
```

不要自己解析 body 后再验签（`req.text()` 必须在 `parseEvent` 之前调用，且只能调一次）。

---

## 异步任务模式（PDF 生成）

PDF 生成耗时 60-120s，Stripe webhook 不能等。模式：

1. webhook 写库 `reports.status='paid'` → 立即返回 200 给 Stripe
2. webhook 用 `fetch().catch()` 非阻塞触发 `/report-generate`（不 await）
3. `/report-generate` 立刻 ack 202，后台 `generateReport().catch()` 执行
4. 失败：写 `status='failed'` + `error_message` + 调 auto-refund

**防重入**：用状态机 update + RLS 守门：

```sql
update reports set status = 'generating', generation_started_at = now()
  where id = $1 and status = 'paid'   -- 只有 paid 才能进 generating
returning *
```

返回 0 行 → 已经被另一个 worker 处理，直接 409 退出。

---

## 错误响应规范

| Status | 场景 | body |
|--------|------|------|
| 401 | JWT 无效 / 缺失 | `{error:'unauthorized'}` |
| 402 | 配额耗尽 | `{error:'quota_exceeded',remaining:0}` |
| 403 | 操作非自己资源 | `{error:'forbidden'}` |
| 404 | chart_id / report_id 不存在 | `{error:'not_found'}` |
| 409 | 资源状态不允许操作（如重复触发） | `{error:'invalid_state',current:'generating'}` |
| 422 | 请求参数错误 | `{error:'invalid_request',details:[...]}` |
| 500 | 未捕获 | `{error:'internal'}` + Sentry 上报 |

---

## CORS 共享代码 (`_shared/cors.ts`)

```typescript
export const corsHeaders = () => ({
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ALLOW_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})

export const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })

export async function getAuthUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) return null
  const { data, error } = await supabase.auth.getUser(auth)
  return error ? null : data.user
}
```

生产环境 `CORS_ALLOW_ORIGIN` 必须设为具体域名，不要 `*`。

---

## Forbidden Patterns

- ❌ Edge Function 内 inline 写 LLM 调用（必须 `_shared/llm.ts`）
- ❌ 同步等待 PDF 生成（必须异步触发）
- ❌ Webhook 不验签
- ❌ 用 `console.log` 打印 access_token / API key（Supabase log 会泄露）
- ❌ 直接 throw 给客户端（必须 catch + 标准 json 错误响应）
- ❌ CORS 设 `*` 在生产环境
