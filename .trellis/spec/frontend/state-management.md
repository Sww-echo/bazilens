# State Management

> Zustand for global state. 不引 Redux / Jotai / React Query。

---

## State Categories

| 类别 | 工具 | 例子 |
|------|------|------|
| URL state | React Router 7 params + searchParams | `/chart/:id` / `?tab=reading` |
| Local component state | `useState` / `useReducer` | 表单输入、折叠面板开关 |
| Global app state | Zustand stores | 当前用户、订阅档位、配额、Cookie 同意 |
| Server state | Zustand store + Supabase Realtime | 命盘列表、解读历史、PDF 进度 |
| Streaming state | `useState` 内 ref + accumulator | SSE 解读流式文本 |

---

## Stores（Sprint 1 必备）

### authStore

```typescript
// src/stores/authStore.ts
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

type AuthState = {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}))
```

### subscriptionStore

```typescript
type Tier = 'free' | 'plus' | 'pro'
type SubscriptionState = {
  tier: Tier
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired'
  currentPeriodEnd: Date | null
  fetch: () => Promise<void>
}
```

### quotaStore

```typescript
type QuotaState = {
  readingsUsed: number
  readingsLimit: number      // 衍生：tier → limit
  pdfReportsUsed: number
  fetch: () => Promise<void>
}
```

### consentStore

```typescript
type Consent = {
  necessary: true            // 永远 true
  analytics: boolean         // PostHog
  errors: boolean            // Sentry
  marketing?: boolean
  agreedAt: string | null
}
```

---

## When to Use Global State

提升到 Zustand 的判断：
- ✅ 跨 3+ 路由共享（如当前用户、订阅档位）
- ✅ 多组件订阅同一数据（如配额，UpgradeButton + ChartInputForm 都看）
- ✅ 异步初始化（auth session 恢复）

留在 `useState` 的：
- 表单字段
- 打开 / 关闭 UI 状态
- 单页面内的派生数据

---

## Server State 同步

模式：**Zustand 缓存 + Supabase Realtime 触发刷新**

```typescript
// 订阅 reports 进度（PDF 详批生成中）
useEffect(() => {
  const channel = supabase.channel(`report-${reportId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'reports',
      filter: `id=eq.${reportId}`,
    }, (payload) => {
      setProgress(payload.new.progress)
      if (payload.new.status === 'ready') {
        useReportsStore.getState().refresh()
        navigate(`/report/${reportId}`)
      }
    }).subscribe()
  return () => { channel.unsubscribe() }
}, [reportId])
```

**不用 React Query / SWR**：
- 增加依赖与 bundle 体积
- Supabase Realtime + Zustand 已经够用
- 命理产品没有多列表页 / 复杂缓存需求

---

## Initialization Pattern

`App.tsx` 启动时：

```typescript
useEffect(() => {
  // 1. 恢复 Cookie 同意（同步 localStorage → store）
  useConsentStore.getState().restore()

  // 2. 恢复 auth session（异步）
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setUser(session?.user ?? null)
  })

  // 3. auth 状态变化监听
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
    useAuthStore.getState().setUser(session?.user ?? null)
    // 登录后拉订阅 + 配额
    if (session) {
      useSubscriptionStore.getState().fetch()
      useQuotaStore.getState().fetch()
    }
  })
  return () => subscription.unsubscribe()
}, [])
```

---

## Common Mistakes

- ❌ 把整个 Supabase response 塞进 store（只存 normalized 数据）
- ❌ 在 store 里调用 `fetch()` 而不暴露 loading/error 状态
- ❌ 多个组件分别订阅同一个 Realtime channel（在 store 里订阅一次）
- ❌ 用 `useEffect` + `useState` 模拟全局状态（直接 Zustand）
