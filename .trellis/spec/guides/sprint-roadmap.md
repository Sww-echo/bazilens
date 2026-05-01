# Sprint Roadmap

> Source: PLAN §5-§7. 个人 + AI 辅助开发，里程碑驱动而非时间盒。

---

## Sprint 0：上线前置（一次性，不写代码）

外部审核延迟 + 内容预热不可压缩。Day 1 必须启动：

- 注册 10 个外部账号：Supabase / Anthropic / OpenAI / DeepSeek / Stripe / Vercel / Sentry / PostHog / Resend / **Apple Developer**（提前 2 周）
- 注册 3 个社媒：小红书海外 + X + 公众号订阅号 → 立即开始内容预热
- 选定品牌 → **BaziLens** + 域名 + USPTO 商标查询
- 第一篇 SEO 博客（4000+ 字）+ 5 篇小红书短内容
- 收集 20 盘 golden test set（`ai-quality-eval.md`）
- Termly 模板生成隐私政策 + 服务条款（Apple 提审前必须 URL 可访问）
- Fork mingyu 本地跑通

---

## Sprint 1：上线 + 第一个付费用户

**DoD = 至少 1 个真实付费**（订阅或 PDF 任一）。

**砍刀清单**（不要扩 scope）：
- ❌ 八字 / 紫微以外 6 种命理
- ❌ App / Capacitor / RevenueCat
- ❌ en 英文版
- ❌ 流年 / 合盘 PDF SKU
- ❌ LocalStorage 迁移逻辑

**Sprint 1 必做**：
- ✅ 三模型路由 + fallback
- ✅ 三档订阅 + PDF 单次付费双轨
- ✅ Magic Link + Google + Apple OAuth
- ✅ Sentry + PostHog
- ✅ zh-CN + zh-TW
- ✅ 八字 + 紫微
- ✅ Stripe Customer Portal
- ✅ PDF 详批 $14.99

**冷却期**（强制）：上线后 2 周不加新功能，只修 bug + 监控漏斗。即使 AI 帮你 1 周写完 Sprint 1，也必须等 2 周才能进 Sprint 2。

---

## Sprint 2：数据驱动扩展 + 上 App

**进入门槛**（必须同时满足）：
- Sprint 1 上线后冷却期 ≥ 2 周
- Sentry 错误率 < 1%
- 累计 ≥ 5 个真实付费

**Sprint 2 范围**：
- 加 6 种命理（六爻 / 梅花 / 奇门 / 大六壬 / 塔罗 / 灵签）
- 多 PDF SKU（流年 $9.99 / 合盘 $12.99 / 紫微一生总论 $14.99）
- en 英文版
- Capacitor → iOS 提审 → Android 上架
- RevenueCat App 内购

**DoD**：
- 累计 100+ 付费用户
- iOS 上架成功
- 多 SKU 转化率验证

---

## Sprint 3+：按数据分叉（无时间界限）

| 数据 | 方向 |
|------|------|
| 付费率 ≥ 8%, MRR ≥ $1K | **加杠杆**：SEO 内容站独立域 / KOL / 付费投放 / 社区 |
| 3% ≤ 付费率 < 8%, MRR $200-1K | **调产品**：PDF 涨价 $19.99 / 落地页 A/B / 退订挽留 |
| 付费率 < 3%, MRR < $200 | **转向 / wind down**：英文版 BaZi / 关停止损 |

**硬性退出条件**：Sprint 1 上线 3 个月仍 < 3% 付费率 → 触发 wind down，不要"再坚持一下"。

---

## 每个任务开始前检查

1. 这个任务在哪个 Sprint？是不是该 Sprint 范围内？
2. 砍刀清单上有没有？如果有，立刻停止讨论
3. DoD 是什么？怎么验证完成？
4. 哪些 spec / guide 该读？（用 `trellis-before-dev` 自动注入）
