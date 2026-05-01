# BaziLens

> 海外华人 AI 命理 SaaS — 八字 / 紫微 / 占卜排盘 + AI 解读 + 详批 PDF
>
> 二开自 [Brhiza/mingyu](https://github.com/Brhiza/mingyu)（保留命理引擎，重做产品形态）

---

## 项目状态

🚧 **Sprint 0**：初始化阶段。完整产品 / 商业 / 工程规划见 `docs/PLAN.md` + `docs/TECH_SPEC.md`。

---

## 文档

| 文件 | 内容 |
|------|------|
| [docs/PLAN.md](docs/PLAN.md) | 产品 / 商业 / Sprint 路线 / 合规策略（1300+ 行） |
| [docs/TECH_SPEC.md](docs/TECH_SPEC.md) | 数据模型 / Edge Function / 三模型路由 / PDF 详批实现（2300+ 行） |
| [.trellis/spec/](.trellis/spec/) | AI agent 自动注入的开发规约（trellis 工作流） |

---

## 技术栈

- **前端**：React 19 + Vite 7 + TypeScript 5.9 + React Router 7
- **后端**：Supabase（Postgres + Auth + Storage + Edge Functions）
- **AI**：Claude Sonnet 4.6（Pro）+ GPT-4.1（Plus）+ DeepSeek V3（Free），三模型 fallback
- **支付**：Stripe（Web 订阅 + PDF 单次付费）/ RevenueCat（Sprint 2 App 内购）
- **国际化**：react-i18next，zh-CN + zh-TW（Sprint 1）/ en（Sprint 2）
- **监控**：Sentry + PostHog
- **部署**：Vercel + Supabase

---

## 命理引擎（保留自 mingyu）

| 模块 | 文件位置 |
|------|---------|
| 八字 | `src/utils/bazi/`（31 文件） |
| 紫微 | iztro NPM 包 + `src/lib/ziwei-prompts.ts` |
| 占卜（六爻 / 梅花 / 奇门 / 大六壬 / 塔罗 / 灵签） | `src/lib/divination/algorithms/`（Sprint 2 启用） |
| 历法 | tyme4ts NPM 包 + `src/utils/timeManager.ts` |

**Sprint 1 仅启用八字 + 紫微**。

---

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量模板
cp .env.example .env.local
# 填入 Supabase / Stripe / Anthropic / OpenAI / DeepSeek 等 key

# 3. 启动 Supabase（需先安装 supabase CLI）
supabase start

# 4. 跑 migrations
supabase db reset

# 5. 启动前端
npm run dev
```

详见 `docs/TECH_SPEC.md` §0 环境检查清单。

---

## Sprint 1 范围

✅ **Do**：八字 + 紫微 / 三档订阅 + PDF 单次付费 / Magic Link + Google + Apple OAuth / Stripe + Customer Portal / 三模型路由 + fallback / Sentry + PostHog / zh-CN + zh-TW

❌ **Don't**：6 种占卜命理 / App 上架 / 英文版 / 多 PDF SKU / LocalStorage 迁移

详见 `docs/PLAN.md` §5。

---

## 致谢

- [Brhiza/mingyu](https://github.com/Brhiza/mingyu) — 命理引擎与排盘算法
- [tyme4ts](https://github.com/6tail/tyme4ts) — 中国古代历法计算
- [iztro](https://github.com/SylarLong/iztro) — 紫微斗数排盘
