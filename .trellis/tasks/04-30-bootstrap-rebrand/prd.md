# Bootstrap and Rebrand mingyu to BaziLens

## Goal

把 mingyu 上游仓库改造为 BaziLens 项目骨架。**保留命理引擎**，**删除老 UI**，**搭起新架构**。

> 详细背景见 `docs/PLAN.md` §0 + §5.1 + `.trellis/spec/frontend/directory-structure.md` "关键改造"。

---

## Scope

### In Scope（本任务做完为止）

1. **品牌 / 元数据**
   - [x] `package.json` name → `bazilens-web`
   - [x] `README.md` 重写
   - [x] `.env.example` 创建
   - [x] `.gitignore` 更新（含 `.env.*` / Supabase / Vercel）
   - [x] `docs/` 拷入 PLAN.md / TECH_SPEC.md / mingyu 原 README

2. **trellis 工作流**
   - [x] `trellis init --claude --user solo`
   - [x] `.trellis/spec/supabase/` 完整 4 个文件（index / llm-routing / migrations / edge-functions）
   - [x] `.trellis/spec/frontend/` 4 个核心文件（index / directory-structure / state-management / type-safety）
   - [x] `.trellis/spec/guides/` 6 个项目专属（product-overview / sprint-roadmap / privacy-pii / apple-review / ai-quality-eval / customer-support）

3. **依赖**（package.json 新增）
   - [ ] `@supabase/supabase-js` `@stripe/stripe-js` `zustand` `i18next` `react-i18next` `i18next-browser-languagedetector` `@sentry/react` `posthog-js` `react-markdown`
   - [ ] devDependency: `supabase` CLI

4. **目录脚手架**（创建空 / placeholder 文件）
   - [ ] `src/api/` — `client.ts` `auth.ts` `charts.ts` `readings.ts` `subscriptions.ts` `reports.ts` `tickets.ts`
   - [ ] `src/stores/` — `authStore.ts` `subscriptionStore.ts` `quotaStore.ts` `consentStore.ts`
   - [ ] `src/i18n/` — `index.ts` + `locales/zh-CN.json` + `locales/zh-TW.json`
   - [ ] `src/hooks/` — 空目录加 README
   - [ ] `src/types/` — `database.types.ts` placeholder + `api.types.ts`
   - [ ] `supabase/` — 空 placeholder（详细 init 在下一个任务）

5. **删除 mingyu 老 UI**
   - [ ] `src/pages/InputPage.tsx` `ResultPage.tsx` `RecordsPage.tsx` `BirthTimeReversePage.tsx` `TutorialPage.tsx`
   - [ ] `src/components/` 老组件清理（保留可复用 utils）
   - [ ] `src/composables/` mingyu 老 hooks 删除（新建 `src/hooks/`）
   - [ ] `src/App.tsx` 改为占位路由（等用户 UI 稿）
   - [ ] `src/styles.css` 保留（含 fonts / 重置样式），UI 稿到位时再清理

### Out of Scope（其他任务做）

- ❌ Supabase migrations（`04-30-supabase-init`）
- ❌ `_shared/` 工具实现（`04-30-shared-utilities`）
- ❌ Edge Functions（独立任务）
- ❌ 真实 UI 实现（等用户 UI 稿）

---

## DoD

- [ ] `npm install` 通过，无依赖冲突
- [ ] `npm run typecheck` 通过（即使有 placeholder，类型不能报错）
- [ ] `npm run dev` 启动，访问 `/` 看到 BaziLens placeholder 页面（不报错）
- [ ] `git status` 干净（除 commit 外无未提交）
- [ ] `.trellis/spec/` 全部填好（可以让其他 trellis 子 agent 读）
- [ ] mingyu 引擎（`src/utils/bazi/` `src/lib/divination/` etc.）原封不动

---

## Key References

- `docs/PLAN.md` §5（Sprint 1 砍刀清单）
- `docs/TECH_SPEC.md` §1（仓库结构）+ §1.2（依赖）
- `.trellis/spec/frontend/directory-structure.md`（关键改造表）

---

## Notes

- 这是 Sprint 0 → Sprint 1 之间的"清场"任务，不涉及任何业务逻辑
- 完成后下一步触发 `04-30-supabase-init`
- mingyu 引擎不动是项目最大资产保护原则（PLAN §0 假设）
