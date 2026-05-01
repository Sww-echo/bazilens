# Type Safety

> TypeScript 5.9 strict 模式 + Supabase 自动生成类型。

---

## Configuration

`tsconfig.app.json` 必须保持：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

不要为了图省事关任何严格选项。

---

## Type Organization

| 来源 | 位置 | 工具 |
|------|------|------|
| Supabase schema → TS | `src/types/database.types.ts` | `supabase gen types typescript --project-id xxx > src/types/database.types.ts` |
| Edge Function 响应 | `src/types/api.types.ts` | 手写，与后端 schema 对齐 |
| 命理引擎类型 | `src/types/divination.ts` | mingyu 已有 |
| Component props | 内联或 `<Component>.types.ts` | 视组件复杂度 |

---

## Supabase Types Pattern

```typescript
// src/types/database.types.ts （自动生成，不要手改）
export interface Database {
  public: {
    Tables: {
      profiles: { Row: {...}, Insert: {...}, Update: {...} }
      charts: { Row: {...}, ... }
      // ...
    }
    Functions: {
      consume_reading_quota: {
        Args: { p_user_id: string, p_tier: string }
        Returns: { allowed: boolean, remaining: number, reason: string | null }[]
      }
    }
  }
}

// src/api/client.ts
import { Database } from '@/types/database.types'
export const supabase = createClient<Database>(URL, ANON_KEY)
```

之后所有调用都有自动推导：

```typescript
const { data } = await supabase.from('charts').select('*')
// data 类型自动推断为 Database['public']['Tables']['charts']['Row'][] | null
```

---

## Validation（Runtime 校验）

仅在 boundary 校验，**内部代码默认相信类型**：

| 边界 | 工具 |
|------|------|
| 用户输入（form / URL params） | 手写校验函数（Sprint 1 不引 Zod） |
| Edge Function 请求体 | 手写校验 + 早返回 422 |
| 第三方 webhook payload | Stripe SDK / Resend SDK 自带校验 |
| LLM 输出 | 红线检测（`_shared/redline.ts`），不需要 schema 校验（自由文本） |

**不引 Zod 的原因**（Sprint 1）：
- 增加 ~40KB bundle
- 边界点很少（form 主要是出生时间）
- 手写校验更明确报错

如果 Sprint 2 边界点 > 10 个，再引入 Zod。

---

## Type Patterns

### Discriminated Unions for SSE Events

```typescript
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; reading_id: string }
  | { type: 'error'; message: string }
```

### Branded Types for IDs

```typescript
type UserId = string & { readonly __brand: 'UserId' }
type ChartId = string & { readonly __brand: 'ChartId' }
type ReportId = string & { readonly __brand: 'ReportId' }

// 防止 user_id 误用为 chart_id
function getReport(id: ReportId): Promise<Report> { ... }
```

仅在 Sprint 2+ 出现 ID 混淆 bug 后再引入。

### Result Type for Failable Ops

```typescript
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E }

async function purchasePDF(chartId: ChartId): Promise<Result<{ checkoutUrl: string }, 'quota_exceeded' | 'payment_failed'>> {
  // ...
}
```

---

## Forbidden Patterns

| 模式 | 替代 |
|------|------|
| `any` | `unknown` + 类型守卫 |
| `as Type` 强制断言 | 类型守卫函数（`isXxx`） |
| `// @ts-ignore` | `// @ts-expect-error <理由>` + 立刻修 |
| `Object.keys(x) as Array<keyof X>` | 用类型安全的 helper |
| 手写 Database 类型 | `supabase gen types typescript` 重新生成 |

---

## Workflow

```
schema 改变 → 跑 supabase gen types → 提交 database.types.ts
       ↓
   tsc 报错 → 顺着 error 改前端代码（自动找到所有受影响位置）
```

**不允许**手动改 `database.types.ts`，下次重新生成会被覆盖且不一致。
