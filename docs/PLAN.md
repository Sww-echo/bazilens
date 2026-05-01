# 命语二开方案 · 出海版

> 目标：将命语 (Brhiza/mingyu) 二开为面向**海外华人**的命理 + AI 解读付费产品，
> 后期扩张到西方 BaZi 蓝海用户。
> 单兵作战，3 个月内做出能赚钱的 MVP。

---

## 0. 前提假设（请纠正）

| # | 假设 | 影响 |
|---|---|---|
| 1 | 单人开发，每周 15-25 小时 | 决定时间线松紧 |
| 2 | 一期目标用户：海外华人（北美/澳/东南亚），保留中文 UI 为主 | 决定 i18n 优先级 |
| 3 | 一期变现：订阅 + 单次详批 PDF | 决定支付链路 |
| 4 | 不申请国内 ICP 备案，所有服务部署海外 | 决定云厂商选择 |
| 5 | 个人 Apple Developer + Google Play 账号 | 决定能否上架商店 |
| 6 | 预算上限：首年 $1,500 内（含 AI 调用） | 决定技术栈选择 |

---

## 1. 整体架构决策

```
┌─────────────────────────────────────────────────────┐
│                  用户终端                            │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ Web (PWA)│   │ iOS App  │   │ Android App  │    │
│  │  Vercel  │   │Capacitor │   │  Capacitor   │    │
│  └────┬─────┘   └────┬─────┘   └──────┬───────┘    │
│       └──── 同一份 React 代码 ─────────┘            │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼──────┐         ┌───────▼────────┐
    │ Supabase  │         │ Edge Function  │
    │  - Auth   │         │  - AI 代理     │
    │  - DB     │         │  - 配额校验    │
    │  - Storage│         │  - 流式输出    │
    └────┬──────┘         └───────┬────────┘
         │                        │
         │      ┌────────────┼────────────┐
         │      │            │            │
         │  ┌───▼───┐  ┌─────▼────┐  ┌────▼─────┐
         │  │Claude │  │ GPT-4.1  │  │ DeepSeek │
         │  │Sonnet │  │  (Plus)  │  │  (Free)  │
         │  │(Pro)  │  └──────────┘  └──────────┘
         │  └───────┘
         │
    ┌────▼─────────┐
    │ Stripe       │  ← Web 订阅
    │ RevenueCat   │  ← App 内购
    └──────────────┘
```

### 关键技术选型

| 模块 | 选型 | 理由 |
|------|------|------|
| 后端服务 | **Supabase** | Auth+Postgres+Storage+Edge Function 一站式，免运维 |
| AI Pro 档 | **Claude Sonnet 4.6** | 中文命理质量最强，留给 Pro 做差异化 |
| AI Plus 档 | **GPT-4.1** | 比 Claude 便宜 ~50%，中文长文本质量足够撑 Plus |
| AI Free 档 | **DeepSeek V3** | 价格 1/10，免费档够用，控制薅羊毛成本 |
| 订阅 (App) | **RevenueCat** | 免费档够用，自动处理 Apple/Google 计费 |
| 订阅 (Web) | **Stripe** | 海外信用卡标配 |
| App 打包 | **Capacitor** | 复用 React 代码，零重写 |
| 部署 | **Vercel** + Supabase | 免费档起步 |
| 监控 | **Sentry** + **PostHog** | 错误 + 行为分析，免费档够 |
| 邮件 | **Resend** | 验证码、订阅通知 |

---

## 2. 数据模型 (Supabase Postgres)

```sql
-- 用户：直接用 Supabase Auth 自带 auth.users
-- profile 表存业务字段
profiles (
  id uuid PK refs auth.users,
  display_name text,
  avatar_url text,
  locale text default 'zh-CN',  -- zh-CN/zh-TW/en
  created_at, updated_at
)

-- 命盘记录（八字/紫微/占卜统一存）
charts (
  id uuid PK,
  user_id uuid FK profiles,
  type text,        -- 'bazi' | 'ziwei' | 'liuyao' | 'meihua' | ...
  title text,       -- 用户起名（如 "我的本命盘"）
  input_data jsonb, -- 出生信息 / 占卜问题
  chart_data jsonb, -- 排盘结果（前端引擎产出）
  is_favorite bool,
  created_at, updated_at
)

-- AI 解读会话
readings (
  id uuid PK,
  user_id uuid FK,
  chart_id uuid FK charts,
  scene text,            -- 'marriage' | 'career' | 'wealth' | ...
  question text,         -- 用户具体问题
  prompt jsonb,          -- 传给 LLM 的完整 prompt（保留供调优）
  response text,         -- AI 输出
  model text,            -- 'claude-sonnet-4-6' | 'gpt-4-1' | 'deepseek-v3'
  tokens_used int,
  cost_usd numeric,
  created_at
)

-- 配额（免费额度计数）
usage_quotas (
  user_id uuid PK,
  period_start date,     -- 当月起始
  readings_used int,     -- 本月已用解读次数
  pdf_reports_used int   -- 本月已用详批
)

-- 订阅状态（RevenueCat/Stripe webhook 同步过来）
subscriptions (
  user_id uuid PK,
  tier text,             -- 'free' | 'plus' | 'pro'
  source text,           -- 'stripe' | 'revenuecat'
  current_period_end timestamptz,
  status text,           -- 'active' | 'canceled' | 'past_due'
  raw jsonb              -- 原始 webhook payload
)

-- 详批 PDF 报告
reports (
  id uuid PK,
  user_id uuid FK,
  chart_id uuid FK,
  type text,             -- 'full_bazi' | 'liunian' | 'compatibility'
  status text,           -- 'pending' | 'generating' | 'ready' | 'failed'
  pdf_url text,          -- Supabase Storage 路径
  paid_at timestamptz,
  created_at
)
```

### RLS 策略
- 所有表开 RLS，默认 `auth.uid() = user_id` 才能读写
- `readings` / `reports` 不允许客户端直接 insert（必须走 Edge Function）

---

## 3. 前后端职责分工

| 职责 | 放哪 | 备注 |
|------|------|------|
| 排盘算法（八字/紫微/占卜引擎） | **前端** | 已经写好了，不动 |
| 提示词组装 | **前端 + Edge Function 校验** | 前端先组，Edge 加签防伪造 |
| LLM 调用 | **Edge Function** | 保护 API key + 计费 |
| 配额计数 | **Edge Function (原子操作)** | 防客户端篡改 |
| 订阅状态 | **Webhook 进 DB** | 客户端只读 |
| PDF 生成 | **Edge Function 异步任务** | 用 react-pdf 或 puppeteer |

---

## 4. 商业化设计

### 三档订阅
| 档位 | 价格 | 权益 |
|------|------|------|
| Free | $0 | 排盘无限 + 每月 3 次 AI 解读（DeepSeek V3） |
| Plus | $4.99/月 / $39.99/年 | 每月 30 次 GPT-4.1 解读 + 历史无限保存 |
| Pro | $9.99/月 / $79.99/年 | 200 次/月 Claude Sonnet 4.6 解读 + 流年大运 + 合盘 + 优先模型 |

### 单次付费（高客单价）
- 详批报告 PDF：$14.99（八字一生总论）
- 流年大运报告：$9.99
- 合盘报告：$12.99

### 价格锚点
比西方占星 App（Co-Star Plus $5.99 / Sanctuary $19.99）略低 20%，
对海外华人友好；详批 PDF 单价是利润大头。

---

## 5. Sprint 1：上线 + 第一个付费用户

> 个人 + AI 辅助开发，按里程碑而非工期。砍刀基于"商业风险 / 外部依赖 / 上线 bug 表面"逻辑保留。
> Sprint 1 DoD = **第一个真实付费用户**（订阅或 PDF 任一）。

### 5.0 Sprint 0：上线前置（一次性，不依赖工期）

外部审核延迟 + 内容预热不可压缩，必须 Day 1 启动：

- 注册 10 个外部账号：Supabase / Anthropic / OpenAI / DeepSeek / Stripe / Vercel / Sentry / PostHog / Resend / **Apple Developer（提前 2 周申请）**
- 注册 3 个社媒：小红书海外 + X + 公众号订阅号 → 立即开始内容预热
- 选定品牌名 + 域名 + 商标查询（"命语"出海需起英文名，例如 BaziLens / FateInsight）
- 起草第一篇 SEO 博客（4000+ 字）+ 5 篇小红书短内容
- 收集 20 盘 golden test set（见 §12.1）
- Termly 模板生成隐私政策 + 服务条款（必须在 Apple 提审前就线上可访问）
- Fork mingyu 本地跑通

### 5.1 Sprint 1 砍刀清单

**仍砍（基于商业风险，不是工时）**：
- ❌ 八字 / 紫微以外的 6 种命理（六爻 / 梅花 / 奇门 / 大六壬 / 塔罗 / 灵签）→ 测试面 / 维护面 / 焦点稀释
- ❌ App / Capacitor → Apple 审核延迟不可压缩，Sprint 2 末再交
- ❌ en 英文版 → 先验证海外华人市场，西方 BaZi 蓝海留 Sprint 2
- ❌ 流年 / 合盘 PDF SKU → 先卖一个 PDF 看转化
- ❌ LocalStorage 迁移 → 首版无老用户

**因 AI 辅助加回（写代码不是瓶颈）**：
- ✅ 三模型路由（Free DeepSeek / Plus GPT-4.1 / Pro Claude）首版直接做齐
- ✅ 三档订阅 + PDF 单次付费**双轨**（让用户选愿付的方式）
- ✅ Magic Link + Google OAuth + Apple OAuth（注册转化率 +30%）
- ✅ Sentry + PostHog Day 1 接入
- ✅ zh-CN + zh-TW（简繁切换 AI 几乎免费，覆盖港台市场）
- ✅ 八字 + 紫微两种命理（紫微引擎 mingyu 已有，AI 帮做 prompt 模板）
- ✅ Stripe Customer Portal（一个 API call）
- ✅ PDF 详批 $14.99 单 SKU（见 §13）

### 5.2 Sprint 1 任务依赖排序

| # | 任务 | 依赖 |
|---|------|------|
| 1 | Vite + Supabase init + 0001 migration（含 reports 新字段，见 §13） | — |
| 2 | Magic Link + Google OAuth + Apple OAuth | 1 |
| 3 | profiles 自动创建触发器 + zh-CN/zh-TW i18n 路由 | 2 |
| 4 | 八字命盘读 Supabase（替换 LocalStorage） | 3 |
| 5 | 紫微命盘读 Supabase | 3 |
| 6 | Edge Function `/reading`（三模型路由 + Anthropic prompt cache） | 4,5 |
| 7 | 解读 UI 流式渲染 + rating（埋 §12.4 在线反馈闭环钩子） | 6 |
| 8 | 三档订阅 Stripe Checkout + Customer Portal + Webhook | 1 |
| 9 | 配额逻辑（usage_quotas + RPC + Pro 200 次/月软封顶） | 8 |
| 10 | **PDF 详批 Edge Function（核心利润中心，见 §13）** | 6 |
| 11 | Stripe Webhook → 触发 PDF 异步生成 | 8,10 |
| 12 | PDF 进度条 UX（Realtime / 轮询）+ Resend 邮件通知 | 10 |
| 13 | Sentry + PostHog 接入（含 §10.5 漏斗埋点） | — |
| 14 | 落地页（八字 + 紫微介绍 / 试用 / 订阅 + PDF CTA） | 7,8,10 |
| 15 | 自定义域名 + Vercel 部署 + Supabase Site URL | 14 |
| 16 | **1 周端到端冒烟测试**（含三模型 fallback / 退款 / 数据备份脚本） | 15 |
| 17 | 5 朋友内测 → 修关键 bug | 16 |
| 18 | **邀请第一个真实付费用户** | 17 |

### 5.3 Sprint 1 DoD（必须满足才能进 Sprint 2）

- [ ] 一个陌生人能：注册（Email / Google / Apple）→ 排八字或紫微盘 → 看免费 AI 解读 → 升级 Plus 或购买 PDF → 全流程无 bug
- [ ] **至少 1 个真实付费**（订阅或 PDF 任一）
- [ ] Sentry P0 错误率 < 1%（24h 滚动）
- [ ] golden test set 平均分 ≥ 4.0
- [ ] 数据备份脚本（每天 pg_dump 到私有仓库）已跑通
- [ ] 隐私政策 + 服务条款线上可访问

### 5.4 Sprint 1 上线后 2 周冷却期（强制）

- ❌ 不加新功能，只修 bug
- ❌ 不启动 Sprint 2 任务
- ✅ 监控 Sentry / PostHog 漏斗
- ✅ 用户反馈每天 review
- ✅ 评估 Sprint 1 DoD 数据，决定下一步分叉（见 §7）

> 即使 AI 帮你 1 周写完 Sprint 1，也**必须等 2 周才能进 Sprint 2**——上线 bug 通常 7-14 天才暴露完，提前扩功能会让 bug 累积失控。

---

## 6. Sprint 2：数据驱动扩展 + 上 App

### 6.1 进入 Sprint 2 的前置门槛

只有同时满足以下三项，才启动 Sprint 2：
- Sprint 1 上线后冷却期 ≥ 2 周
- Sentry 错误率 < 1%
- 累计 ≥ 5 个真实付费（订阅或 PDF）

如果不满足 → 留在 Sprint 1 优化 / 转向（见 §7）。

### 6.2 Sprint 2 范围

**扩功能**：
- ✅ 加 6 种命理剩余引擎（六爻 / 梅花 / 奇门 / 大六壬 / 塔罗 / 灵签）+ 各自 prompt 模板
- ✅ 多 PDF SKU：流年大运 $9.99、合盘 $12.99、紫微一生总论 $14.99
- ✅ en 英文版（西方 BaZi 蓝海试水）+ 西方占星专属 prompt 改写
- ✅ 流年推送 / 邮件营销

**上 App**：
- ✅ Capacitor 套壳 iOS / Android
- ✅ RevenueCat 接入 App 内购（订阅同步到 subscriptions 表）
- ✅ TestFlight 内测 → App Store 提审（**按 §11 完整 checklist**）
- ✅ Google Play 上架（审核宽松，可同步进行）

**数据驱动优化**：
- ✅ 详细漏斗分析（PostHog cohort）
- ✅ A/B 测落地页文案（Plus vs PDF 转化率）
- ✅ 退订挽留页 + 召回邮件

### 6.3 Sprint 2 DoD

- [ ] 累计 100+ 付费用户
- [ ] iOS 上架成功（即使审核反复，最终通过）
- [ ] 多 PDF SKU 转化率验证：流年 / 合盘销量 ≥ 八字总论的 50%
- [ ] en 版上线 + 至少 1 个英文付费用户
- [ ] App / Web 月度漏斗看板成型

---

## 7. Sprint 3+：持续运营（按数据分叉，无时间界限）

不再按时间盒推进，**根据 Sprint 2 末数据选择路径**：

### 7.A 加杠杆（付费率 ≥ 8%，MRR ≥ $1,000）

- SEO 内容站独立域名（与产品域分离，更利于排名）
- 海外华人 KOL 合作（YouTube / 小红书 / TikTok 命理博主分销）
- 每日运势推送 + 邮件营销（Apple 灰名单解禁后再加）
- 付费投放试水（CAC 实测 ≤ $9 才能持续投）
- 命理社区功能（评论 / 共享命盘 / 排行榜）→ 注意 Apple 审核风险

### 7.B 调产品（付费率 3-8%，MRR $200-1,000）

- PDF 涨价试 $19.99 + 多 SKU 组合套餐
- 落地页 A/B 测（命理工具 vs 命理咨询定位）
- 退订挽留页 + 重激活邮件
- 不扩功能，先优化已有路径转化

### 7.C 转向 / wind-down（付费率 < 3%，MRR < $200）

- 转英文版 BaZi 蓝海（西方占星市场更大但需重做产品语境）
- 或承认产品不通，关停止损（此时已沉没成本但避免继续投入）
- 项目交接 / 卖给团队的备选方案

> **退出条件硬性约束**：Sprint 1 上线 3 个月仍 < 3% 付费率，触发 7.C。不要让"再坚持一下"消耗精力，转向也是有效的退出。

---

## 8. 关键风险与对策

| 风险 | 概率 | 对策 |
|------|------|------|
| Apple 审核拒绝（命理类） | 中 | 包装为 "Traditional Chinese astrology study tool"，加足免责声明 |
| AI 解读质量不稳 | 高 | 提示词版本化 + 用户反馈打分 + 持续调优 |
| 任一模型涨价 / 不可用 | 中 | 三模型路由（Claude / GPT / DeepSeek），Edge Function `_shared/llm.ts` 抽象层支持热切换；任一档位失败自动 fallback 到下一档（Pro→Plus→Free） |
| 订阅退款 / 拒付 | 中 | Stripe 自动处理，记录用户行为给客服判断 |
| 海外华人冷启动慢 | 高 | 月 3 必须把内容/社媒铺起来 |

---

## 9. 单位经济模型 (Unit Economics)

> 假设：成本基于 2026-Q1 市场价；汇率/费率取保守值；推理 token 估算见下表。

### 9.1 单次成本估算

**单次 AI 解读成本**（基于 TECH_SPEC §7.3 提示词模板，输出 800-1200 字）

| 模型 | 输入 tokens | 输出 tokens | 单次成本 | 用于档位 |
|------|------------|------------|---------|---------|
| Claude Sonnet 4.6 | ~2,500 | ~1,200 | **$0.026** | Pro |
| GPT-4.1 | ~2,500 | ~1,200 | **$0.0146** | Plus |
| DeepSeek V3 | ~2,500 | ~1,200 | **$0.002** | Free |

> 输入估算：system 300 + 模板 500 + chart_data jsonb 1500 + question 200 ≈ 2500
> 价格：Claude $3/$15、GPT-4.1 $2/$8、DeepSeek $0.27/$1.10（per MTok）

**单次详批 PDF 成本**（输出 5000-8000 字，单轮调用）

| 项 | 成本 |
|---|------|
| Claude 调用 | $0.10-0.15 |
| PDF 生成（react-pdf 或 puppeteer） | ~$0.001 |
| Storage（Supabase ~50KB/PDF） | 忽略 |
| **合计** | **~$0.13** |

### 9.2 三档订阅毛利

| 档位 | 售价 | 渠道净收入 | 月度 AI 成本 | 毛利 | 毛利率 |
|------|------|-----------|--------------|------|--------|
| Free | $0 | $0 | 3 × $0.002 = **$0.006** | **-$0.006** | — |
| Plus（Web/Stripe，GPT-4.1） | $4.99 | $4.54 | 30 × $0.0146 = **$0.44** | **$4.10** | 90% |
| Plus（App/Apple，GPT-4.1） | $4.99 | $3.49 | $0.44 | **$3.05** | 61% |
| Pro（Web，Claude，假设 50 次/月） | $9.99 | $9.39 | 50 × $0.026 = **$1.30** | **$8.09** | 81% |
| Pro（App，Claude，假设 50 次/月） | $9.99 | $6.69 | $1.30 | **$5.39** | 54% |

> ✅ **模型路由已敲定**：Free=DeepSeek V3，Plus=GPT-4.1，Pro=Claude Sonnet 4.6。
> Plus 用 GPT-4.1 比 Claude 便宜约 44%，毛利率从 75% 提升到 90%；Pro 保留 Claude 维持高端差异化。三档模型的 prompt 模板可共用，但 Pro 用 prompt_versions 加专属"流年/合盘"模板拉差异。

### 9.3 "无限"档位的隐患

PLAN §4 Pro "解读无限"——如果不软性封顶，5% 重度用户能把 Pro 整体毛利拉负：

| 用户类型 | 月度调用 | 月度成本 | vs Pro 净收入 $9.39 |
|---------|---------|---------|--------------------|
| 普通 Pro | 30 次 | $0.78 | 毛利 $8.61 ✅ |
| 重度 Pro | 200 次 | $5.20 | 毛利 $4.19 ⚠️ |
| 滥用 Pro | 500 次 | $13.00 | **亏损 $3.61** ❌ |

→ **Pro 软性封顶 200 次/月**（覆盖 99% 真实需求）；UI 不写"无限"，改为"高频使用"。

### 9.4 详批 PDF：真正的利润中心

| 项 | 数值 |
|---|------|
| 售价 | $14.99 |
| Web 净收入（Stripe 3% + $0.30） | $14.24 |
| App 净收入（Apple 30%） | $10.49 |
| AI + 存储成本 | $0.15 |
| **Web 毛利** | **$14.09 (94%)** |
| **App 毛利** | **$10.34 (69%)** |

**关键洞察**：
- 1 单 PDF 毛利 ≈ 4 个月 Plus 订阅毛利
- 100 用户每月 1 单 PDF = $1,400+ 月毛利；100 个 Plus = $260
- → **PDF 应该是首页最显眼的入口，订阅是次级转化**（与 PLAN 当前的订阅优先策略相反，建议 Week 3 一并调整 IA）

### 9.5 规模化预测

固定月成本：

| 项 | 0 付费 | 100 付费 | 1k 付费 | 10k 付费 |
|---|--------|----------|---------|----------|
| Vercel | $0 | $0 | $20 | $20 |
| Supabase | $0 | $25（Pro 必须 / PITR 备份） | $25 | $599 |
| Sentry | $0 | $0 | $26 | $80 |
| PostHog | $0 | $0 | $0 | $450 |
| Resend | $0 | $0 | $20 | $90 |
| 域名 / 杂项 | $1 | $1 | $5 | $20 |
| **合计** | **$1** | **$26** | **$96** | **$1,259** |

收入侧（按 7:3 Plus:Pro 混合 + 月均 0.3 单 PDF/付费用户，Plus=GPT 路由）：

| 付费用户 | 订阅月毛利 | PDF 月毛利 | 固定成本 | **净月利润** |
|---------|-----------|-----------|---------|-------------|
| 100 | ~$530 | ~$420 | $26 | **~$924** |
| 1,000 | ~$5,300 | ~$4,200 | $96 | **~$9,400** |
| 10,000 | ~$53,000 | ~$42,000 | $1,259 | **~$93,700** |

**Break-even ≈ 30 付费用户**就能覆盖月度固定成本。瓶颈是**获客**（见 §10），不是成本。

### 9.6 CAC / LTV 假设

> 真实数据上线后才有，先用行业基准做规划。

- **LTV 假设**：Plus 平均订阅 6 个月 → LTV = $4.54 × 6 = $27（Web Plus）
- **CAC 上限**：保持 LTV/CAC ≥ 3 → 单付费用户 CAC ≤ $9
- **现实约束**：海外华人付费 App CAC 通常 $5-15，**接近 LTV 边界** → 推动方向：
  - 提高 LTV：详批 PDF 加购、年付折扣（已设计）
  - 压低 CAC：SEO/小红书自然流量为主，**前 3 月禁止付费投放**

---

## 10. 冷启动方案

> 原 PLAN §7 只有 4 行字，但获客失败 = 项目失败。本节按周拆解。

### 10.1 哲学：内容先行，产品次之

命理是**信任型购买**（用户花钱前要先信任你"懂"），不是工具型购买。**内容创作必须 Day 1 启动**，不能等产品上线再做。

### 10.2 渠道 ROI 排序

| 渠道 | 启动成本 | 见效周期 | 上限 | 优先级 |
|------|---------|---------|------|-------|
| **小红书海外** | 低 | 2-4 周 | 高 | **P0** 主战场 |
| **SEO 长内容博客** | 中 | 3-6 月 | 极高 | **P0** 长期复利 |
| **北美华人微信群** | 低 | 1-2 周 | 中 | P1 精准转化 |
| **X / Threads 中文圈** | 低 | 1-2 月 | 中 | P1 |
| **Reddit r/Chinese / r/astrology** | 低 | 1 月 | 中 | P2 英文版 |
| **Product Hunt** | 中 | 1 天 | 低（一次性） | P2 |
| **付费投放（Meta/Google）** | 高 | 立即 | 取决于 LTV | **暂缓**（前 3 月禁用） |
| **YouTube/Bilibili 命理博主合作** | 高 | 1 月 | 高 | P3 验证后再做 |

### 10.3 时间线（与开发并行）

**Pre-launch（Week -4 ~ -1，与 Month 1 开发同步）**
- Week -4：注册小红书海外账号 + Twitter/X + 公众号订阅号
- Week -3：发布 5 篇预热内容（八字常识科普 + 自己的命盘案例）
- Week -2：进入 5 个目标社群（北美华人微信群、命理 Discord）只观察不发广告
- Week -1：积累 100 关注 + 5 个内测用户名单

**Launch Week**
- 周一：小红书首发"我做了一个..."自来水帖（含真实案例 + 邀请码）
- 周三：朋友圈 + 内测用户 referral（每邀请 1 人送 PDF 报告）
- 周五：Product Hunt 英文版上线（命名 "BaZi Reader"）
- 周日：根据数据决定下周内容方向

**Post-launch（Month 1-3）**
- 每周 1 篇深度博客（4000+ 字，对标 Google "八字 婚姻"等长尾词）
- 每周 3 条小红书短内容（命盘脱敏案例 + 用户反馈）
- 每月 1 次"命理直播解读"（在线答疑导流）

### 10.4 内容创作 SOP

**SEO 博客模板**（每篇 4000-6000 字）：
- 长尾关键词命中（用 Ahrefs Free / Google Suggest）
- 结构：现象铺垫 → 命理原理 → 真实案例 → 工具引导
- 案例脱敏：用户授权 + 改时辰 + 改名
- 每篇结尾 CTA："想了解你自己的命盘？[免费试用]"

**小红书内容模板**（每篇 300-800 字）：
- 标题公式："{身份} 看完八字才发现 / {数字} 个 {场景} 的人都有这个特点 / 海外华人 {话题}"
- 首图：命盘截图（用产品 UI 自带的，强化品牌）
- 文末：评论区引导（不主动发链接避免限流）

### 10.5 冷启动 KPI

| 时间节点 | 注册用户 | 付费用户 | 付费率 | 月度自然流量 |
|---------|---------|---------|--------|------------|
| Week 4 | 50 | 5 | 10% | 500 |
| Month 2 | 300 | 30 | 10% | 3,000 |
| Month 3 | 1,000 | 100 | 10% | 10,000 |
| Month 6 | 5,000 | 500 | 10% | 30,000 |

> 命理类付费率行业基准 5-15%（远高于普通 SaaS 1-3%），10% 是**合理偏保守**预期。
> 如果 Month 1 末付费率 < 5% → 产品/定价问题，不是获客问题。

### 10.6 退出条件

如果 Month 3 末未达成：
- 注册 < 200 → 渠道方向错了，转向英文版/西方 BaZi 蓝海
- 付费率 < 3% → 产品价值不够强，停止扩张做产品改进
- MRR < $200 → 项目无法 sustaining，准备 wind-down 或卖给团队

---

## 11. Apple 审核策略

> 命理类 App 在 App Store 被打回率极高，必须按工程任务对待。

### 11.1 App 定位（核心策略）

❌ "Fortune Telling App" / "Predict your future" / "命理预测"
✅ **"Traditional Chinese Astrology Study & Reference Tool"**

把自己包装成**学习工具**，不是占卜工具：
- Apple Guidelines 5.0/4.0 对"宣称预测"几乎零容忍
- "Study tool" / "Reference" 类目审核宽松得多

### 11.2 App Store Connect 配置清单

| 项 | 推荐值 | 理由 |
|---|--------|------|
| Primary Category | **Reference** | 不要选 Lifestyle（命理 App 重灾区） |
| Secondary Category | Education | 加强"研究工具"定位 |
| Age Rating | **4+** | 17+ 影响曝光；保持内容文化向 |
| Content Rights | 自有 | 命理理论是公共领域 |
| App Privacy | 完整填写 | iOS 17+ 严查 |

### 11.3 文案高危词

**禁用词**（描述 + 截图 + 应用内）：
- predict / will happen / accurate / 100% / guarantee
- fortune telling / prediction / forecast
- lucky number / lucky day / lucky color（Apple 视为博彩诱导）
- cure / heal / disease / treatment（医疗声明，触发 Guideline 1.4.1）
- destiny / fate（含蓄替代为 "tendency" / "potential"）

**安全词**：
- traditional study / cultural heritage / classical metaphysics
- for entertainment and reference only
- exploration / self-reflection / cultural understanding
- tendency / potential / inclination
- based on traditional Chinese theory

### 11.4 必备免责声明

**App Store Description 末尾**（必填）：
```
Disclaimer: This app is a traditional Chinese astrology
study and reference tool for educational and entertainment
purposes only. Results do not constitute medical, legal,
financial, or psychological advice. Users should consult
qualified professionals for important life decisions.
```

**应用内**（onboarding 第一屏强制确认 + 每次解读结果末尾自动追加）：
```
本工具基于传统命理研究，仅供文化参考与个人探索，
不构成医疗、法律、财务、投资或心理咨询建议。
```

### 11.5 隐私清单（iOS 17+ 必填）

`PrivacyInfo.xcprivacy` 至少声明：
- Email Address (App Functionality, Linked)
- Other User Content（出生时间，App Functionality, Linked）

**关键**：第一版不要集成任何含 ATT (App Tracking Transparency) 的 SDK（避免 prompt 流失 + 审核质疑）。PostHog/Sentry 都要关闭设备级追踪。

### 11.6 区域下架清单

命理/占卜在以下国家受限或违法，**首发就在 Pricing & Availability 中下架**：
- 沙特阿拉伯、阿联酋、巴基斯坦、伊朗（已被 Apple 整体下架）
- 马来西亚部分州（视情况）

→ 默认上架地区：**美 / 加 / 澳 / 新西兰 / 新加坡 / 英 / 欧盟 / 香港 / 台湾 / 日 / 韩**

### 11.7 提审 Pre-flight Checklist

提交前 24 小时核对：
- [ ] 主流程 5 张截图（带正确文案，无禁用词）
- [ ] App Preview 视频（30 秒，演示"研究工具"属性）
- [ ] Demo 账号 + 密码（在 Test Notes 提供）
- [ ] Test Notes：「This is a traditional Chinese astrology STUDY tool. Users input birth time to learn classical metaphysics interpretations. Not a fortune telling app. Disclaimers are shown on first launch and on every result.」
- [ ] 隐私政策 URL 可访问（GitHub Pages 或 Vercel 静态托管）
- [ ] 服务条款 URL 可访问
- [ ] 上线地区已排除高危国家
- [ ] 应用内 onboarding 强制免责声明确认
- [ ] In-App Purchase 商品已配置 + 价格已审批

### 11.8 被拒应对剧本

| 拒绝原因 | 应对 |
|---------|------|
| 4.0 Design / Spam | 强调差异化（深度命理 vs 占星 App）+ 提供 review video 对比 |
| 1.4.1 Safety / Physical Harm | 移除任何健康相关词；强化免责声明 |
| 4.3 Spam（命理 App 太多） | 提供原创算法证明（八字引擎 31 个文件）+ 学术参考 |
| 5.1.1 Data Collection | 完善隐私政策；最小化数据收集 |
| 2.1 Information Needed | 补充 Test Notes，演示视频 |
| 5.0 Legal | 强化"reference / study" 定位；删除任何"prediction" 用词 |

### 11.9 灰名单（第一版禁止加入）

以下功能虽然吸引人但极易触发 Apple 审核问题，**Month 4+ 验证商业可行后再加**：
- 每日运势推送通知（5.0 Legal + 4.5.4 Push 双重风险）
- "Lucky Number / Lucky Day" 类输出
- 与彩票 / 投资相关的解读场景
- 健康 / 疾病预测
- 命理排行榜 / 兼容性匹配（社交属性触发更多审核）

---

## 12. AI 解读质量评估机制

> readings 表设计了 rating 字段但缺评估闭环。命理是内容产品，AI 幻觉一次就流失用户。

### 12.1 Golden Test Set 构建（Week 2 内完成）

**目标**：20-30 个标准命盘，每盘附"专家判断要点"作为 ground truth。

**采样策略**：

| 格局类别 | 数量 | 来源 |
|---------|------|------|
| 建禄 / 月刃格 | 5 | 公开命理书籍（《渊海子平》《滴天髓》案例） |
| 食神 / 伤官格 | 5 | 同上 |
| 正官 / 七杀格 | 5 | 同上 |
| 财格 / 印格 | 5 | 同上 |
| 从格 / 化气格 | 3 | 教科书经典案例 |
| 真实用户盘（脱敏 + 授权） | 5 | 自己 + 朋友 |

每个标盘的 `expected.json` 范例：
```json
{
  "chart_id": "test-001",
  "expected": {
    "yongShen": ["金", "水"],
    "geJu": "建禄格",
    "key_factors": [
      "庚金生于申月得令",
      "时透丁火制金为用",
      "需注意：日支寅木冲申"
    ],
    "forbidden_terms": ["缺金", "命中无财", "克夫"],
    "tone_required": "professional, not fatalistic"
  }
}
```

### 12.2 离线评估 Pipeline

```
新 prompt 版本 → 跑全部 20 盘 → 输出 20 份解读
                                  ↓
                            人工对照 expected.json 打分
                                  ↓
                          每盘 5 维度（1-5 分）：
                          - 用神判断准确度
                          - 格局识别准确度
                          - 命理幻觉（编造神煞 / 错误术语）
                          - 表达专业度（不玄学化）
                          - 行动建议可执行性
                                  ↓
                          平均分 < 3.5 → 拒绝上线
                          平均分 ≥ 4.0 → 灰度 5%
                          平均分 ≥ 4.3 → 全量上线
```

工具：先手动 Excel/Sheet，Month 3 再考虑 LLM-as-judge 自动化（GPT-4 / Claude Opus 当裁判）。

### 12.3 红线检测（自动化，必须实施）

**规则 1：神煞白名单**
所有 AI 输出必须只能引用 `baziShenSha.ts` 中已定义的 40+ 神煞。Edge Function 后处理：
```ts
const ALLOWED_SHENSHA = new Set(['天乙贵人', '将星', '华盖', /* ... */]);
const matched = response.match(/[一-龥]{2,4}(?=星|煞|神)/g) || [];
const fabricated = matched.filter(s => !ALLOWED_SHENSHA.has(s));
if (fabricated.length > 0) {
  // 落库 quality_flag + 触发告警
}
```

**规则 2：禁用断言**
正则扫描 AI 输出，禁用以下表达：
- "命中缺X"（民间错误说法）
- "克夫" / "克妻" / "克子"（情感伤害）
- "活不过 XX 岁" / "X 岁有大灾"（健康预测，触发 Apple 1.4.1）
- "今年必定 X" / "一定会 X"（绝对断言）

**规则 3：免责声明强制注入**
后处理强制在解读末尾追加：
```
---
本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。
```

### 12.4 在线反馈闭环

- **用户评分**：每条 reading 完成后 UI 强制 5 星打分（不评分软性提示，不阻塞使用）
- **低分自动审查**：rating ≤ 2 自动入 `quality_review_queue` 视图，每周一固定 1 小时 review 上周低分（10-20 条）
- **模式总结 → 改 prompt → 进入下一轮评估**

模式举例：
- "金弱火旺时模型常误判用神为水" → prompt 增加"金被火克时优先考虑湿土泄火生金"
- "模型常生成'虚星'伪命理术语" → 加强红线检测正则

### 12.5 A/B 测试基础设施

利用已设计的 `prompt_versions` 表：
```ts
const userBucket = hashUserId(user.id) % 100;  // 0-99
const promptId = userBucket < 5
  ? 'bazi-marriage-v3'   // 5% 灰度新版本
  : 'bazi-marriage-v2';  // 95% 稳定版
```

**晋升门槛**：新版本累计 100 条 rating，平均分 ≥ 旧版本 → 晋升 50% → 全量。

### 12.6 事故响应

如果生产发现质量退化：
1. **1 分钟内**：`prompt_versions.active = false` → 全部流量回前一版本
2. **5 分钟内**：受影响用户标记，准备退款 / 补单
3. **1 小时内**：写事故 ADR，分析根因
4. **24 小时内**：修复 + 重新评估 + 灰度上线下一版本

---

## 13. PDF 详批产品规格（核心利润中心）

> §9.4 算出 PDF 是 94% 毛利的利润中心。Sprint 1 必须把它做扎实，不是后期可加可不加的功能。

### 13.1 产品形态

| 项 | 数值 |
|---|------|
| 总字数 | 5,000-8,000 字（用户感知"值这个钱"的下限） |
| 页数 | 12-16 页 |
| 配图 | 命盘图 + 五行环形图 + 十神分布表（满足"专业感"） |
| 生成时长 | 60-120s（异步，用户不等待） |
| 售价 | $14.99（Sprint 1 单 SKU）/ Sprint 2 加 $9.99 流年 + $12.99 合盘 |

### 13.2 章节框架（首版"八字一生总论" $14.99）

```
封面页
  ├── 标题：「八字一生总论 / 命主 [星号脱敏]」
  ├── 出生信息（阳历 + 阴历 + 真太阳时）
  └── 生成日期 + 报告编号 + 二维码（防盗版）

第 1 章 命理总论（800 字）
  - 五行格局判断 + 配图
  - 用神喜忌总结
  - 一生格调与基本走向

第 2 章 五行喜忌详解（1000 字）
  - 各五行旺衰
  - 用神 / 忌神原理
  - 调候 / 病药 / 通关

第 3 章 性格与人生走向（1000 字）
  - 十神性格分析
  - 优势 / 劣势
  - 适合行业方向（3-5 类倾向，不做职业占卜）

第 4 章 六亲缘分（1200 字）
  - 父母 / 兄弟姐妹（柱位 + 十神）
  - 配偶（年月日时柱配偶宫）
  - 子女（食伤 / 时柱）
  ⚠️ 红线检测拦"克夫""克妻"等情感伤害词（见 §12.3）

第 5 章 大运流年走势（1500 字）
  - 当前大运起止 + 主题
  - 未来 10 年大运预览（每柱 200 字）
  - 流年要点（仅未来 3 年，避免过度预测）

第 6 章 财运 / 健康 / 学业（1200 字）
  - 财星结构 + 是否得用
  - 五行健康提示（不做疾病预测，触发 Apple 1.4.1）
  - 印星结构 + 学习宜忌

第 7 章 实用建议（800 字）
  - 五行调和建议（颜色 / 方位 / 行业）
  - 大运转折期注意事项
  - 命主自我修养建议（避免宿命论）

附录 A：命盘原始数据（四柱 + 十神 + 神煞 + 大运表 + 用神参数）
法律免责声明（中英双语，最末页）
```

### 13.3 LLM 调用编排（关键决策）

**分章节多次调用 vs 一次性生成**

✅ **采用分章节串行 + Anthropic prompt cache**：

```ts
// supabase/functions/report-generate/index.ts 核心逻辑
const chapters = ['overview','wuxing','personality','family','dayun','fortune','advice']
const sections = []
for (const [i, ch] of chapters.entries()) {
  const text = await generateChapter(ch, chartData, {
    promptVersion: `bazi-pdf-${ch}-v1`,
    maxTokens: 2000,
    cachePrefix: chartData  // Anthropic prompt cache（命盘是公共 prefix）
  })
  sections.push({ chapter: ch, text })
  // 实时更新进度
  await supabase.from('reports')
    .update({ progress: Math.round((i + 1) / chapters.length * 100) })
    .eq('id', reportId)
}
```

**为什么不并行**：
- Anthropic 首版 rate limit ~5 req/min，7 个并发会被打回
- 串行能利用 prompt cache（每章 2500 input tokens 只算一次 cache write，剩 6 章 cache read 是 90% 折扣）
- 总时长 60-90s 完全可接受（用户不等）

**含 prompt caching 后成本重算**：

| 项 | 计算 | 成本 |
|---|------|------|
| Cache write（首章） | 2,500 × $3.75/MTok | $0.0094 |
| Cache read（剩 6 章） | 6 × 2,500 × $0.30/MTok | $0.0045 |
| Output（7 章 × 1,200 tokens） | 8,400 × $15/MTok | $0.126 |
| **PDF AI 总成本** | | **~$0.14** |
| Web 净收入（Stripe） | $14.24 | |
| **Web 毛利** | $14.24 - $0.14 - $0.001（存储） | **$14.10 (94%)** ✓ |

### 13.4 PDF 渲染选型

| 方案 | 优势 | 劣势 |
|------|------|------|
| **react-pdf** ✅ | TS 原生 / Edge Function 能跑 / 组件化 | 中文字体要打包嵌入（~800KB CJK 子集），Markdown→PDF 需手写转换 |
| puppeteer | HTML/CSS 灵活 | Edge Function 不支持，要 Browserless 服务 + 成本高 |
| pandoc | 工具链成熟 | Serverless 不友好 |

**推荐 react-pdf** + Noto Sans SC 子集化：

```bash
# CI 预生成字体子集（常用 3000 汉字 ~800KB）
pyftsubset NotoSansSC-Regular.otf \
  --text-file=common-chinese-3000.txt \
  --output-file=NotoSansSC-Subset.ttf
# 部署时随 Edge Function 上传
```

**配图实现**：
- 命盘图 / 五行环形图 / 十神表 → 现有 React 组件
- 用 `satori` 服务端渲染为 PNG → 嵌入 PDF
- 或直接在 react-pdf 里用 SVG 重写（更轻但工作量大）

### 13.5 异步生成流程

```
用户付款（Stripe Checkout）
   ↓
Stripe Webhook → reports.status = 'paid' + paid_at
   ↓
触发 Edge Function `/report-generate`（异步，trigger via pg_notify 或 webhook）
   ↓
逐章生成 → 实时 update reports.progress (0→100)
   ↓
合成 PDF → 上传 Supabase Storage（私有 bucket）
   ↓
reports.status = 'ready' + pdf_url + ready_at
   ↓
Resend 邮件「PDF 已生成」+ signed URL（24h 有效）
   ↓
Supabase Realtime 推送到前端 → 进度条 done
```

**前端 UX**：
- 付款后立刻跳"PDF 生成中"页（不阻塞，不能让用户等）
- 进度条 = `reports.progress`（Realtime 订阅 or 轮询 5s）
- 显示估算："预计 1-2 分钟，生成完成会邮件通知您"
- 完成后自动跳"我的报告"列表 + 邮件兜底

### 13.6 失败处理 / 退款

| 失败场景 | 处理 |
|---------|------|
| Claude 5xx | 自动重试 2 次 |
| Claude 仍失败 | fallback 到 GPT-4.1 重生成该章 |
| GPT 也失败 | 标记 `status='failed'` + 暂停整个生成 |
| PDF 渲染失败 | `status='failed'` + 道歉邮件 |
| 字体加载失败 | 兜底浏览器默认字体（丑但能交付） |
| `status='failed'` 超 24h | 自动调 Stripe Refund API 全额退款 + 通知邮件 |

**质量退款**（用户主动）：
- 用户对 PDF 评分 ≤ 2 → 入审查队列
- 客服判断标准：
  - 明显 AI 幻觉（编造神煞 / 错读格局） → 退款 + 记录到 prompt 改进 backlog
  - "我不喜欢结果" → 不退（在服务条款明确）
  - 严重情感伤害词（克夫等漏网之鱼） → 退款 + 红线检测加规则

### 13.7 数据模型补充（reports 表加字段）

在 §2 已有 `reports` 表基础上 alter：

```sql
alter table reports add column progress smallint default 0 check (progress between 0 and 100);
alter table reports add column sections jsonb;                     -- 各章节中间数据
alter table reports add column quality_score smallint;             -- 红线检测分（自动）
alter table reports add column user_rating smallint check (user_rating between 1 and 5);
alter table reports add column refund_id text;                     -- Stripe refund_id
alter table reports add column refund_reason text;
alter table reports add column model_used text;                    -- 'claude' | 'gpt-4.1'（含 fallback 记录）
alter table reports add column total_tokens_input int default 0;
alter table reports add column total_tokens_output int default 0;
alter table reports add column total_cost_usd numeric(10,6) default 0;
```

### 13.8 PDF prompt 版本化（与 §7 提示词版本化打通）

PDF 7 章对应 7 个 prompt_versions 行：
- `bazi-pdf-overview-v1`
- `bazi-pdf-wuxing-v1`
- `bazi-pdf-personality-v1`
- `bazi-pdf-family-v1`
- `bazi-pdf-dayun-v1`
- `bazi-pdf-fortune-v1`
- `bazi-pdf-advice-v1`

每章独立版本号，单独迭代不影响其他章节质量。Golden test set（§12.1）评估时按章节分别打分。

### 13.9 Sprint 1 PDF 子任务拆解

| 子任务 | 备注 |
|--------|------|
| 字体子集化 + Edge Function 上传 | CI 脚本一次性 |
| react-pdf 模板（封面 + 7 章 + 附录） | 组件化，章节可独立改 |
| LLM 章节编排（含 retry + prompt cache + fallback） | 7 个 prompt_versions 录入 |
| Storage 上传 + signed URL 生成 | 24h 有效期 |
| 进度条 UX（Realtime / 轮询） | Supabase Realtime channel |
| Stripe Checkout（PDF SKU） + Webhook 触发 | 与订阅 Stripe 共享 endpoint |
| Resend 邮件模板（生成中 / 已完成 / 失败） | HTML + 中英双语 |
| 错误处理 + 自动退款 + 道歉邮件 | 24h 失败兜底 |
| 端到端冒烟测试（含失败链路） | 必须包含 fallback / 退款路径 |

### 13.10 Sprint 2 PDF 扩展

- 加 SKU：流年大运 $9.99（仅未来 5 年大运 + 3 年流年深度解读）
- 加 SKU：合盘 $12.99（双盘，对象关系 / 相处建议）
- 加 SKU：紫微一生总论 $14.99（紫微版 vs 八字版可让用户对比购买）
- 套餐：八字 + 紫微 + 流年 = $29.99（原价 $39.97，省 $10）→ 拉客单价

---

## 14. 客服 / 退款 / 投诉 SOP

> 命理产品退款诉求和情绪化投诉远高于普通 SaaS，单兵开发者必须有 SOP 兜底。
> 设计原则：**自动化优先 + 模板化回复 + 止损优于争论**。

### 14.1 客服渠道与 SLA

| 阶段 | 渠道 | SLA |
|------|------|-----|
| Sprint 1 | `support@yourdomain.com` 单一邮箱 + Gmail Labels 分类 | 首次回复 24h，闭环 72h |
| Sprint 2 | 加 in-app 反馈表单 + Plain / Help Scout 免费档 | 同上 |
| Sprint 3+ | 加常见问题自助 KB + 状态查询页 | 首响 12h |

**单兵节奏**：每天固定 **1 小时（早晨）批处理**，避免全天被打断。

**AI 辅助回复**（Sprint 1 即可用）：
- 用 Claude 草拟回复 → 人工审核 → 发送
- Prompt 模板：`你是 {产品名} 客服。基于以下用户邮件和退款政策（§14.2），起草一封专业、共情、不卑不亢的中文回复。如涉及命理结果争议，强调'传统命理研究参考性质'，不做命理对错争论。`

### 14.2 退款矩阵（核心）

| 触发场景 | 处理路径 | 是否退款 | 备注 |
|---------|---------|---------|------|
| PDF `status='failed'` 超 24h | **自动**（§13.6） | ✅ 全额 | 已实现 |
| PDF user_rating ≤ 2 + 明显 AI 幻觉（编造神煞 / 错读格局） | 人工审核 | ✅ 全额 | 同步加入 prompt 改进 backlog |
| PDF user_rating ≤ 2 + "我不喜欢结果" | 人工审核 | ❌ 不退 | ToS 明确："对命理结果的主观感受不构成退款理由" |
| PDF 含严重情感伤害词（克夫等漏网） | 人工审核 | ✅ 全额 + 道歉 | 红线检测加规则 |
| 订阅 7 天内 + 未使用任何额度 | 人工审核 | ✅ 全额 | 首单无理由退款 |
| 订阅 7 天内 + 已用 ≤ 3 次 | 人工审核 | ✅ 部分（按比例） | 扣已用配额成本 |
| 订阅 7 天后 | 引导 Customer Portal 取消 | ❌ 不退 | 已享受当期服务 |
| 重复购买 / 误下单 | **自动** | ✅ 全额 | Stripe Idempotency Key 兜底 |
| 信用卡盗刷投诉 | Stripe Dispute 流程 | Stripe 处理 | 24h 内提交证据避免 $15 dispute fee |
| Chargeback 风暴（5+/月） | 立即转人工 | — | 触发 Stripe Radar 风控审查 |

**退款 SOP**：
1. 用户发邮件 → 客服分类（5 分钟内）
2. 对照矩阵决策 → 通过 Stripe Dashboard 退款（或调 §14 自动退款代码）
3. 邮件回复用户 + 标记 ticket `closed`
4. 如涉及产品问题（AI 幻觉等）→ 创建 prompt 改进 issue

### 14.3 投诉分类与回复模板

**Category 1：解读不准 / AI 幻觉**

> 模板（中文）：
> ```
> {用户称呼}您好，
>
> 感谢您对我们 AI 解读结果的反馈。我们已经将您的具体问题
> 转给产品团队复核。
>
> 关于命理结果的准确性，我们想说明：传统八字 / 紫微命理是基于
> 古典文献的研究工具，AI 解读会存在偏差。这也是为什么我们在每份
> 报告中都强调"仅供文化参考与个人探索"。
>
> {如属实质 AI 幻觉，附加：}
> 经核实，您指出的 [具体内容] 确实是模型生成错误。我们已为您
> 全额退款 ${金额}（预计 5-10 个工作日到账），并致以诚挚歉意。
>
> 如有任何疑问，请直接回复此邮件。
>
> {产品名} 团队
> ```

**Category 2：不喜欢命理结果（情感伤害）**

> 模板核心要点：
> - 共情但不否认结果（不说"AI 错了"会引导误解）
> - 强调"命理是参考工具，自由意志才是主导"
> - 引导用户阅读免责声明
> - 不退款（在 ToS 明确）但可以送一次免费 Plus 解读做止损
> ```
> ...八字 / 紫微讲究的是"知命改运"，传统命理学者从来不主张被结果束缚。
> 我们建议您把这份解读当作了解自己的一个角度，而不是宿命。
>
> 作为补偿，我们为您账户充值了 1 次 Plus 解读额度，您可以从其他
> 角度（如事业、健康）再做探索...
> ```

**Category 3：PDF 生成失败 / 慢**
- 立即检查 `reports.status` + 错误日志
- 若 `failed` → 立即手动退款 + 道歉
- 若 `generating` 超时 → 重新触发 + 通知用户预计时间
- 若 `ready` 但用户没收到邮件 → 重发签名 URL

**Category 4：订阅 / 支付问题**
- 检查 `subscriptions.status` + Stripe Dashboard
- 重复扣款 → 立即退款
- 续费失败 → 引导 Customer Portal 更新支付方式
- 取消未生效 → 检查 `cancel_at_period_end`，必要时 Stripe 立即取消

**Category 5：法律 / 监管投诉**（**最高优先级**）
- 任何来自 FTC / GDPR DPA / Apple Legal / 政府机构的邮件 → 24h 内回复 "已收到，正在处理"
- 不要自己直接回复实质内容 → 先咨询律师
- 保留所有证据（用户数据、合同、记录）
- 见 §14.5 危机响应

### 14.4 命理类特殊场景

**"AI 说我今年破财，你赔我"** 类情绪化用户：

❌ **不要做**：
- 争论命理对错（你赢不了）
- 直接退款（鼓励了恶意行为）
- 删除用户账号（可能触发 Apple / 监管投诉）

✅ **应该做**：
- 共情第一句："理解您看到这样结果会感到不安"
- 重申免责（链接 ToS）
- 提示用户**已经看到了结果，付费时也同意了 ToS**
- 提供"心理咨询师"等专业资源链接（避免触发 Apple 1.4.1）
- 必要时送 1 次免费解读做止损，不退订单

**"AI 说我命短" 类高敏感场景**：
- 立即升级到产品负责人（=你自己）
- 检查 readings 表 + 是否触发了红线检测但未拦住
- 若是真实 AI 失误 → 立即退款 + 紧急升级红线规则
- 邮件附**心理援助热线**（北美：988 Suicide & Crisis Lifeline）

### 14.5 危机响应 Runbook

**5 种危机 + 立即动作**：

#### A. 监管机构联系（FTC / GDPR DPA / 国家相关部门）

立即（< 1h）：
- [ ] 截图保存原始邮件 + headers
- [ ] 不回复实质内容，仅 ack 收到
- [ ] 发邮件给律师 / 法律咨询服务（如 LegalZoom）
- [ ] 记录到内部 incidents log

后续（1-7 天）：
- 律师起草正式回复
- 配合提供数据（如 GDPR 数据访问请求）
- 如涉及罚款 → 优先解决，不要 escalate

#### B. Apple App Store 政策违规通知

立即（< 24h）：
- [ ] 进 App Store Connect 阅读完整 reviewer notes
- [ ] 对照 §11.8 被拒应对剧本
- [ ] 24h 内提交修正版（拖延会被视为放弃）
- [ ] 如严重违规（5.0 Legal）→ 暂停 App，先解决合规

#### C. 媒体负面报道（"算命 App 骗钱"）

立即（< 4h）：
- [ ] 截图保留原报道
- [ ] 不公开回应，避免发酵
- [ ] 检查是否真有产品问题（如解读极差、退款拒绝）→ 立即修复
- [ ] 如纯粹误解 → 私信记者提供事实材料

后续：
- 加强客户成功（主动给低分用户回访）
- 网站 / App 加"用户真实反馈"板块（脱敏正面案例）

#### D. 恶意用户骚扰 / 网暴

立即：
- [ ] 屏蔽（profile.status='blocked'）
- [ ] 保存所有沟通记录
- [ ] 必要时向 Resend / 邮件服务报告滥用
- [ ] 严重情况报警（针对人身威胁）

#### E. Chargeback 风暴 / 信用卡拒付集中爆发

立即：
- [ ] 暂停付费投放（如有）
- [ ] 检查 Stripe Radar 是否标记了风险
- [ ] 找出爆发源头（同 IP？同手机号？某渠道用户？）
- [ ] 配合 Stripe 提交 dispute 证据

后续：
- Stripe Radar 加规则（按地区 / IP / 邮箱域名风控）
- 高风险国家先关支付（沙特、巴基斯坦等已在 §11.6 排除）
- 必要时改为预付制（如 PDF 不立即退款，3 天后才能申请）

### 14.6 客服工具栈

| 阶段 | 工具 | 成本 |
|------|------|------|
| Sprint 1 | Gmail（support@yourdomain.com） + Labels 分类 + Templates 草稿 | $0 |
| Sprint 1 | Stripe Dashboard 手动退款 | $0 |
| Sprint 1 | 自建 admin 页（Supabase Studio + 1 个 React 页） | $0 |
| Sprint 2 | Plain.com 或 Help Scout 免费档（≤ 50 mailbox） | $0 |
| Sprint 2 | Crisp.chat / Intercom Lite（in-app chat） | $0-25/月 |
| Sprint 3+ | Zendesk Suite / Front | $50+/月 |

**关键不要做**：
- ❌ 不要在 Sprint 1 就上 Intercom / Zendesk（月费高 + 学习成本）
- ❌ 不要用微信 / WhatsApp 当客服（无审计 + 跨设备同步差）

### 14.7 客服数据模型（同步到 TECH_SPEC §15）

新增 `support_tickets` 表（详见 TECH_SPEC §15.1）：
- 用户工单 + 分类 + 状态 + 优先级
- 关联 readings / reports / subscriptions（追溯具体业务对象）
- 关联 refund_id（追溯退款记录）

### 14.8 SLA 监控指标

接入 PostHog 监控：

| 指标 | 目标 | 告警 |
|------|------|------|
| 24h 首次回复率 | ≥ 95% | < 90% 触发邮件提醒 |
| 72h 闭环率 | ≥ 80% | < 70% 暂停 Sprint 任务，全力处理积压 |
| 退款率（按销售单数） | < 5% | > 10% 立即审查产品 |
| Chargeback 率 | < 1% | > 1% 触发 Stripe Radar 审查（也是 Stripe 的硬性红线） |
| 月度未结工单 | < 10 | > 20 考虑 Sprint 2 加客服工具 |

---

## 15. 数据保留 / 删除 / 隐私合规

> Apple 提审 + Stripe 合规 + GDPR 都把这一节当硬要求。Sprint 1 上线前必须就位，不是可选项。

### 15.1 适用法规与已规避

| 法规 | 适用 | 罚款上限 |
|------|------|---------|
| **Apple App Store 隐私要求** | Sprint 2 上 App 必备 | 直接下架 |
| **GDPR**（欧盟用户，含海外华人） | ✅ | €20M 或全球营收 4% |
| **CCPA / CPRA**（加州，海外华人主力市场） | ✅ | $7,500/项违规 |
| **PIPEDA**（加拿大） | ✅ | 类似 GDPR |
| **APPI**（日本） | ✅ | 类似 GDPR |
| **PCI DSS** | Stripe 已处理（我们只持 customer_id） | — |
| 国内 PIPL 个保法 | ❌ 不适用（PLAN §0 已确认不进国内） | — |

### 15.2 PII 资产盘点

| 数据 | 字段 | 敏感度 | 加密策略 |
|------|------|--------|---------|
| 邮箱 | auth.users.email | Medium | Supabase 磁盘加密 |
| 显示名 / 头像 | profiles.display_name / avatar_url | Low | 同上 |
| **出生时间** | charts.input_data.birth_time | **High** | 应用层 AES + 磁盘 |
| **出生地** | charts.input_data.birth_place | **High** | 同上 |
| 排盘结果 | charts.chart_data | Low（衍生计算） | 磁盘 |
| **用户问题** | readings.question | **High**（情感/财务） | 应用层 AES + 磁盘 |
| AI 解读结果 | readings.response | Medium | 磁盘 |
| PDF 内容 | reports.sections, pdf_url | High | Storage bucket 加密 |
| 支付信息 | subscriptions.stripe_*, reports.stripe_* | Medium | Stripe 持有，我们只存 ID |
| IP / UA | Sentry / PostHog | Medium | **关闭设备追踪** |

### 15.3 数据最小化（默认拒绝原则）

❌ 不收集：
- 手机号（邮箱足够）
- 精确地址（出生地仅城市级）
- IP 地址（Sentry / PostHog 关闭设备追踪）
- 性别 / 年龄（命盘已含，不重复要）

❌ 不上报：
- Sentry / PostHog 事件 properties 不写明文 PII
- 邮件 / Slack 告警不写明文 birth_time / email
- 客服回复不在 reply body 引用 birth_time

### 15.4 第三方处理者（DPA 管理）

| 处理者 | 用途 | 数据范围 | DPA 状态 | 数据驻留 |
|-------|------|---------|---------|---------|
| Supabase | DB / Auth / Storage | 全部 | ✅ 默认 | 选 us-east-1 或 eu-west-1 |
| Anthropic | Pro AI 解读 | prompt（命盘 + question） | ✅ Enterprise DPA + Zero retention | US |
| OpenAI | Plus AI 解读 | 同上 | ✅ Zero data retention API（要申请） | US |
| **DeepSeek** | Free AI 解读 | **不发送 PII**（见 §15.5） | ⚠️ DPA 模糊 | **CN** |
| Stripe | 支付 | email + customer_id | ✅ 默认 | US / EU |
| Vercel | Web 托管 | 静态资源 + IP | ✅ | 全球 CDN |
| Sentry | 错误监控 | 脱敏堆栈 | ✅ | US / EU |
| PostHog | 行为分析 | 不含 PII 的事件 | ✅ | US / EU |
| Resend | 邮件 | email + body | ✅ | US |

### 15.5 DeepSeek 数据隔离（关键合规决策）

DeepSeek 隐私政策不透明 + 数据驻留中国 → **Free 档调用前必须脱敏**：
- question 字段过 PII 检测（regex + 关键词）
- 检测到姓名 / 联系方式 / 公司名 → **拒绝调用 DeepSeek**，提示用户升级 Plus（GPT-4.1）
- 命盘数据本身（八字、紫微）不含 PII（衍生计算，不可逆推到出生时间）→ 可以发送
- 实现见 TECH_SPEC §16.6

### 15.6 数据保留期

| 数据类别 | 保留期 | 注销后处理 |
|---------|-------|----------|
| 活跃用户 profiles + charts + readings + reports | 永久（用户可主动删） | — |
| 注销账号 PII | 30 天 grace period（用户改主意可恢复） | 30 天后硬删 |
| 财务记录（Stripe 关联） | **7 年**（税务合规） | 匿名化（user_id → null）保留 stripe_* |
| 退款 / 工单审计 | 7 年 | 匿名化 + 保留 |
| Sentry 错误日志 | 90 天 | TTL 自动 |
| PostHog 事件 | 12 个月 | TTL 自动 |
| Supabase PITR 备份 | 7 天（Pro 档） | 自动 |
| 自建 pg_dump | 30 天 | cron 自动清理 |

### 15.7 GDPR 6 项权利实现

| 权利 | 条款 | 实现方式 |
|------|------|---------|
| 数据访问 | Art. 15 | Account 页"导出我的数据"→ TECH_SPEC §16.3 |
| 更正 | Art. 16 | profile 编辑页（自助） |
| **删除（被遗忘权）** | Art. 17 | "注销账号"→ 30 天 grace + cron 硬删 → §16.4-16.5 |
| 限制处理 | Art. 18 | "暂停账号"按钮（status=paused，停止 AI 处理） |
| 数据可携 | Art. 20 | 同 Art. 15（JSON 标准格式） |
| 反对处理 | Art. 21 | Resend 标准 unsubscribe header（邮件营销退订） |

**注销流程**：

```
用户点击「注销账号」
  ↓
二次确认弹窗（含 30 天恢复期说明）
  ↓
profiles.status = 'pending_deletion'
profiles.scheduled_delete_at = now() + 30 days
  ↓
Stripe 立即取消所有订阅（不收续费）
Resend 发送确认邮件
  ↓
30 天内用户重新登录可恢复
  ↓
30 天后 cron 触发硬删
  ↓
匿名化财务记录（user_id → null，保留 stripe_payment_intent）
```

### 15.8 Cookie / 追踪同意（Sprint 1 必备）

**默认拒绝**（GDPR opt-in 强制）：
- 首访横幅，三个按钮：[全部接受] [仅必要] [自定义]
- 默认仅启用必要 Cookie（Supabase Auth Session）
- PostHog / Sentry 在用户明确同意后才启用
- 同意结果存 localStorage + DB（profile.consent jsonb）

**Cookie 分类**：
| 类别 | 用途 | 默认 |
|------|------|------|
| 必要 | Auth Session / CSRF | ✅ 默认开 |
| 性能 | PostHog 事件 | ❌ 默认关 |
| 错误监控 | Sentry | ❌ 默认关 |
| 营销 | 暂无（Sprint 1 不投放） | — |

**实现选择**：自建简单组件（200 行 React，免费可控）。不上 OneTrust（贵且过度复杂）。

### 15.9 隐私政策必备 10 条

Sprint 0 必须就位（Apple 提审需要 URL 可访问）：

1. 收集的数据类型（按 §15.2 表格）
2. 收集目的（提供服务 / AI 解读 / 支付 / 安全）
3. 法律依据（GDPR Art. 6：合同履行 / 用户同意 / 合法利益）
4. 第三方处理者列表（按 §15.4 表格，含数据驻留）
5. 跨境数据传输（SCC 条款 + 数据驻留地）
6. 保留期（按 §15.6 表格）
7. 用户权利（按 §15.7 表格）+ 行使方式
8. Cookie / 追踪政策
9. 未成年人保护（< 16 岁不允许，需父母同意）
10. 联系方式（DPO 邮箱：privacy@yourdomain.com）+ DPA 投诉渠道

工具：**Termly** 免费档生成 + 自己审核（不要原样直接用）。

### 15.10 数据泄露响应（GDPR Art. 33-34 硬性 72h）

| 阶段 | 时限 | 动作 |
|------|------|------|
| 检测到泄露 | 立即 | 启动 incident response（见 PLAN §14.5） |
| 通知 DPA（监管机构） | **< 72h** | 邮件 + 后续详细报告 |
| 通知受影响用户 | 「高风险」时 | 邮件 + in-app 通知 |
| 内部记录 | 永久 | incidents log |

**触发条件示例**：
- service_role_key 泄露到公开仓库（GitHub Push Protection 兜底）
- Supabase 安全告警（异常 query / 大量 select）
- AI 输出包含其他用户的 PII（cross-contamination，prompt 串扰）
- Stripe / Supabase 服务方通报（订阅他们的安全 newsletter）

### 15.11 未成年人保护

命理类对青少年也有吸引力，但：
- COPPA（美国）：< 13 岁需父母同意
- GDPR：< 16 岁需父母同意
- Apple App Store 4+ 评级：不针对儿童营销

**实现**：
- 注册页强制勾选「我已年满 16 岁」（不是默认勾选）
- ToS 明确「本服务不针对未成年人」
- 客服收到未成年人投诉 → 立即注销账号 + 删数据

### 15.12 密钥轮换 SOP

| 密钥 | 轮换周期 | 应急轮换触发 |
|------|---------|------------|
| Supabase service_role_key | 6 个月 | 任何怀疑泄露立即 |
| Anthropic / OpenAI / DeepSeek API key | 12 个月 | 同上 |
| Stripe Secret Key | 12 个月 | Stripe 安全告警 |
| Stripe Webhook Secret | 12 个月 | 同上 |
| **PII 加密 KEY**（PII_ENCRYPTION_KEY） | 12 个月 | 任何怀疑泄露立即 |
| Resend API Key | 12 个月 | — |

PII 加密 KEY 轮换需双密钥过渡（PII_KEY_VERSION 字段标识）：
1. 上线 v2 → 新数据用 v2 写入，老数据 v1 仍可读
2. 后台 job 逐步把 v1 数据用 v2 重新加密
3. 全部迁移完毕 → v1 key 销毁

---

## 16. 立刻要做的（Sprint 0 / Day 1 启动）

1. **注册 Supabase**（免费档）+ 创建项目
2. **申请 Anthropic API + OpenAI API + DeepSeek API**（各充 $10 测试用）
3. **注册 Apple Developer**（$99 提前申请，审核要 1-2 天 — 见 §11 提前规划文案）
4. **Fork mingyu 仓库**到自己 GitHub
5. **本地跑起来**确认引擎能正常排盘

并行启动（不阻塞 Week 1 但同样紧急，见 §10.3 Pre-launch）：
- 注册小红书海外账号 + Twitter/X，开始内容预热
- 起草第一篇 SEO 博客稿（4000+ 字）
- 收集 20 个 golden test 命盘（见 §12.1）

这 5 + 3 件做完后再进 Week 1 任务。
