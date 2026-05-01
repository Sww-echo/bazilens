# Product Overview

> 高频读取，每个新任务前先扫一眼定位。源文档：`docs/PLAN.md` §0-§4。

---

## 一句话

**BaziLens** = 海外华人 AI 命理 SaaS：八字 + 紫微 + 占卜排盘 + AI 解读 + PDF 详批。

## 关键约束（不要在任务讨论中重新挑战）

- ❌ **不进国内市场**（无 ICP 备案，无公司主体）
- ✅ 全程出海部署：Supabase / Vercel / Stripe / RevenueCat / Apple App Store
- ✅ 一期目标用户：海外华人（北美 / 澳 / 东南亚），中文为主
- ✅ 二期蓝海：西方 BaZi 用户（Sprint 2 加英文版）
- ✅ 单兵 + AI 辅助开发（不限工时，里程碑驱动）
- ✅ Sprint 1 DoD = **第一个真实付费用户**（订阅或 PDF 任一）

---

## 商业化（PLAN §4 + §9）

| 档位 | 价格 | 模型 | 月配额 |
|------|------|------|--------|
| Free | $0 | DeepSeek V3 | 3 解读 |
| Plus | $4.99 / mo | GPT-4.1 | 30 解读 |
| Pro | $9.99 / mo | Claude Sonnet 4.6 | 200 软封顶 |

**详批 PDF**（核心利润中心）：
- $14.99 八字一生总论（首发）
- $9.99 流年大运（Sprint 2）
- $12.99 合盘（Sprint 2）
- 毛利 94% (Web) / 69% (App)

---

## 三档功能矩阵

| 功能 | Free | Plus | Pro |
|------|------|------|-----|
| 八字 + 紫微排盘 | ✅ 无限 | ✅ 无限 | ✅ 无限 |
| 六爻 / 梅花 / 奇门 / 大六壬 / 塔罗 / 灵签 | Sprint 2 | Sprint 2 | Sprint 2 |
| AI 解读 | 3 / 月 (DeepSeek) | 30 / 月 (GPT-4.1) | 200 / 月 (Claude) |
| 历史保存 | 30 天 | 无限 | 无限 |
| 流年 / 大运 | ❌ | ❌ | ✅ Sprint 2 |
| 合盘 | ❌ | ❌ | ✅ Sprint 2 |
| 详批 PDF | 单买 $14.99 | 单买 $14.99 | 单买 $14.99 |

---

## Sprint 1 砍刀清单（重要！不要扩大 scope）

**仍砍**（基于商业风险）：
- ❌ 八字 / 紫微以外的 6 种命理
- ❌ App / Capacitor（Apple 审核延迟，Sprint 2 末再交）
- ❌ en 英文版
- ❌ 流年 / 合盘 PDF SKU
- ❌ LocalStorage → Supabase 迁移逻辑（首版无老用户）

**Sprint 1 必做**：
- ✅ 三模型路由（Free DeepSeek / Plus GPT-4.1 / Pro Claude）
- ✅ 三档订阅 + PDF 单次付费**双轨**
- ✅ Magic Link + Google + Apple OAuth
- ✅ Sentry + PostHog Day 1 接入
- ✅ zh-CN + zh-TW 简繁双语
- ✅ 八字 + 紫微两种命理
- ✅ Stripe Customer Portal
- ✅ PDF 详批 $14.99 单 SKU

---

## 风险红线（任何任务必须规避）

| 风险 | 红线 |
|------|------|
| Apple 审核命理类 | 文案禁用 fortune / predict / destiny / lucky number / cure（详见 `apple-review.md`） |
| AI 解读幻觉 | 神煞白名单 + 禁用断言（克夫 / 缺金 / 必定）（详见 `ai-quality-eval.md`） |
| DeepSeek 数据驻留中国 | Free 档 question 必须脱敏 PII（详见 `privacy-pii.md`） |
| 单兵客服扛不住 | 退款矩阵自动化 + 模板回复（详见 `customer-support.md`） |
| 出生时间 PII 泄露 | 应用层 AES + Storage 加密（详见 `privacy-pii.md`） |

---

## 资料定位

| 文档 | 内容 |
|------|------|
| `docs/PLAN.md` | 商业 / 产品 / Sprint 全文 |
| `docs/TECH_SPEC.md` | 实现细节（DDL / 代码骨架 / API 协议） |
| `.trellis/spec/supabase/` | 后端 spec |
| `.trellis/spec/frontend/` | 前端 spec |
| `.trellis/spec/guides/` | 跨包通用规约（你正在看） |
