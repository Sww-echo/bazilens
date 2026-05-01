# Directory Structure

> BaziLens frontend layout. 重构自 mingyu，保留引擎，重做 UI。

---

## Overview

```
src/
├── api/                       # 所有后端调用封装在这里（Component 不能直接 import supabase）
│   ├── client.ts              # Supabase client 单例
│   ├── auth.ts                # signIn / signUp / signOut / OAuth
│   ├── charts.ts              # 命盘 CRUD（input_data 加密前剥离明文 PII）
│   ├── readings.ts            # AI 解读（流式 SSE）
│   ├── subscriptions.ts       # 订阅状态查询
│   ├── reports.ts             # PDF 详批 + 进度订阅
│   └── tickets.ts             # 客服工单（in-app 反馈）
│
├── stores/                    # Zustand 全局状态
│   ├── authStore.ts
│   ├── subscriptionStore.ts
│   ├── quotaStore.ts
│   └── consentStore.ts        # Cookie 同意状态
│
├── i18n/                      # react-i18next
│   ├── index.ts
│   └── locales/
│       ├── zh-CN.json
│       └── zh-TW.json         # Sprint 1 必备；en 留 Sprint 2
│
├── pages/                     # 路由顶层组件
│   ├── auth/                  # LoginPage / SignupPage / OAuthCallback
│   ├── chart/                 # 命盘输入 + 结果展示
│   ├── reading/               # AI 解读流式页
│   ├── report/                # PDF 进度页 + 列表
│   ├── account/               # AccountPage / SubscriptionPage / SettingsPage
│   ├── upgrade/               # UpgradePage
│   ├── admin/                 # admin/TicketsPage（is_admin only）
│   └── public/                # 落地页 / 隐私政策 / 服务条款
│
├── components/                # UI 组件（待 UI 稿到位）
│   └── CookieConsent.tsx      # 全站 cookie 横幅
│
├── lib/                       # 命理引擎（保留 mingyu 资产）
│   ├── divination/            # 占卜引擎（Sprint 2 启用）
│   │   ├── engine.ts
│   │   ├── config.ts
│   │   └── algorithms/
│   ├── ziwei-prompts.ts       # 紫微提示词
│   └── full-chart-engine.ts   # 全盘引擎
│
├── utils/                     # 八字 / 历法工具（保留 mingyu 资产）
│   ├── bazi/                  # 31 个八字核心引擎文件，不动
│   ├── tarot.ts               # Sprint 2
│   ├── hexagram-data.ts       # Sprint 2
│   └── timeManager.ts
│
├── config/                    # 应用配置（保留 mingyu）
│   ├── divination-data.ts
│   └── meihua-omens.ts
│
├── types/                     # TS 类型
│   ├── database.types.ts      # supabase gen types 生成（不要手改）
│   ├── divination.ts          # 占卜类型（mingyu）
│   └── api.types.ts           # Edge Function 响应类型
│
├── hooks/                     # 自定义 hooks
│   ├── useReading.ts          # 流式解读
│   ├── useReportProgress.ts   # PDF 进度 Realtime
│   └── useSubscription.ts
│
├── constants/                 # 常量
├── data/                      # 静态数据（chinaBirthPlaceTree 等）
├── workers/                   # Web Worker（mingyu 已有）
└── App.tsx + main.tsx + styles.css
```

---

## 关键改造（vs mingyu 上游）

| 路径 | 改造 |
|------|------|
| `src/api/` | **新增**，封装 Supabase + Edge Function 调用 |
| `src/stores/` | **新增**，Zustand 状态管理 |
| `src/i18n/` | **新增**，i18next 国际化 |
| `src/pages/auth` `account` `upgrade` `admin` `public` | **新增** |
| `src/pages/InputPage.tsx` `ResultPage.tsx` `RecordsPage.tsx` `TutorialPage.tsx` `BirthTimeReversePage.tsx` | **删除**（mingyu 老 UI，重做） |
| `src/components/` | **删除老组件**，等 UI 稿重做 |
| `src/composables/` | **删除**（mingyu 老 hooks），新建 `src/hooks/` |
| `src/services/prompts/` | **改造**：原 mingyu 是前端组装 prompt；新版前端只组装基础上下文，完整 prompt 在 Edge Function 拼装 |
| `src/utils/bazi/` | **保留 31 文件不动**（资产） |
| `src/lib/divination/` | **保留**（资产） |
| `src/utils/tarot.ts` `hexagram-data.ts` etc. | **保留**（Sprint 2 启用） |

---

## 命名约定

| 类型 | 命名 |
|------|------|
| Page 组件 | `PascalCase.tsx`（如 `ReadingStreamPage.tsx`） |
| 通用组件 | 同上 |
| Hook | `useCamelCase.ts`（如 `useReportProgress.ts`） |
| Store | `<feature>Store.ts`（如 `authStore.ts`） |
| API 模块 | `<resource>.ts`（如 `readings.ts`） |
| 类型文件 | `<feature>.types.ts` |

---

## 模块边界

```
Component → hooks → api → stores
                     ↓
                  Supabase Edge Function
```

**禁止跳层**：
- ❌ Component 直接调 `api/`（用 hooks 包一层，便于缓存 + 类型推导）
- ❌ Component 调 `supabase` client（必须经 `api/`）
- ❌ Hook 直接调 LLM 服务方（必须经 Edge Function）

---

## Sprint 启用顺序

| Sprint | 启用模块 |
|--------|---------|
| 0 | 仅清理 + 重命名，不动 src |
| 1 | api/ + stores/ + i18n/ + pages/auth + chart + reading + report + account + upgrade + public + admin/TicketsPage（最小） |
| 2 | pages/divination/* + Capacitor + en locale |
| 3+ | pages/community（如做社交） + 内容站独立 repo |
