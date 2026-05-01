# Frontend Guidelines

> React 19 + Vite 7 + TypeScript 5.9 + React Router 7。
> 源：`docs/TECH_SPEC.md` §1, §5, §8；产品 spec：`../guides/product-overview.md`。

---

## Pre-Development Checklist

- [ ] 读 `../guides/product-overview.md` 确认任务在 Sprint 范围内
- [ ] 读 `../guides/apple-review.md` 确认 UI 文案不含禁用词
- [ ] 涉及 PII 字段（出生时间 / 邮箱 / question）必读 `../guides/privacy-pii.md`
- [ ] 不直接调 LLM 服务方 SDK，必须走 Edge Function（`src/api/`）
- [ ] 命盘排盘逻辑用 mingyu 引擎（`src/utils/bazi/` + iztro），不重写

---

## Quality Check

- [ ] `npm run build` 通过 + 无 TypeScript 错误
- [ ] 新增 UI 文案已加 i18n key（zh-CN + zh-TW 都填）
- [ ] PostHog 埋点 properties 不含 PII
- [ ] Sentry init 在 cookie consent 之后
- [ ] 响应式：375px / 768px / 1280px 三档不破样式

---

## Guidelines

| Guide | Description |
|-------|-------------|
| [Directory Structure](./directory-structure.md) | src/ 目录组织 + mingyu 引擎位置 |
| [State Management](./state-management.md) | Zustand stores（auth / subscription / quota / consent） |
| [Type Safety](./type-safety.md) | Supabase 自动生成类型 + 严格模式 |
| [Component Guidelines](./component-guidelines.md) | 组件 props / 命名 / 复合（UI 稿到位后填充） |
| [Hook Guidelines](./hook-guidelines.md) | 数据请求 + Realtime 订阅 |

---

## Key Decisions

1. **保留 mingyu 引擎**：`src/utils/bazi/`（31 文件）+ `src/lib/divination/` + iztro 紫微，不重写
2. **删除 mingyu UI**：等用户提供 UI 稿后重做（保留路由骨架 + 类型）
3. **状态管理用 Zustand**：不引 Redux / Jotai
4. **i18n 用 react-i18next**：zh-CN / zh-TW Sprint 1 必备，en 留 Sprint 2
5. **API 层封装**：所有 Supabase 调用经 `src/api/` 单例，禁止 component 直接 import supabase client
6. **PDF / 解读 UI**：流式渲染用 `react-markdown`；PDF 进度条用 Supabase Realtime

---

## Forbidden Patterns

- ❌ Component 直接 `import { supabase }`（必须经 `src/api/`）
- ❌ 在 Component 写 `process.env.*` / `Deno.env.*`（用 `import.meta.env.VITE_*`）
- ❌ 将 ANON_KEY 之外的 Supabase key 放前端
- ❌ 命盘 chart_data 在前端解码 PII（数据已经在 Edge Function 加密前剔除明文）
- ❌ 写硬编码中文 UI 字符串（用 `t('key')`）
- ❌ 在 component 内 fetch（用 `src/api/` + Zustand 缓存）
