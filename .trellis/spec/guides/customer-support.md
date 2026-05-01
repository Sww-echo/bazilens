# Customer Support SOP

> 命理产品退款诉求 + 情绪化投诉远高于普通 SaaS。源：PLAN §14 + TECH_SPEC §15。

---

## 退款矩阵（写代码 / 写客服回复时按这个判定）

| 触发场景 | 自动 / 人工 | 是否退款 |
|---------|------------|---------|
| PDF `status='failed'` 超 24h | **自动** | ✅ 全额（cron 触发 Stripe Refund） |
| PDF user_rating ≤ 2 + 明显 AI 幻觉 | 人工 | ✅ 全额 + 加 prompt 改进 backlog |
| PDF user_rating ≤ 2 + "不喜欢结果" | 人工 | ❌ 不退，送 1 次免费解读做止损 |
| PDF 含克夫 / 缺金 等漏网词 | 人工 | ✅ 全额 + 红线规则加规则 |
| 订阅 7 天内 + 未使用 | 人工 | ✅ 全额 |
| 订阅 7 天内 + 已用 ≤ 3 次 | 人工 | ✅ 部分（按比例） |
| 订阅 7 天后 | 人工 | ❌ 引导 Customer Portal 取消 |
| 重复购买 / 误下单 | **自动** | ✅ 全额（Stripe Idempotency 保护） |
| 信用卡盗刷 | Stripe Dispute | Stripe 处理（24h 提交证据） |

---

## ToS 必写条款

服务条款（Sprint 0 上线前必须有）必须明确：
- "对命理结果的主观感受不构成退款理由"
- 退款窗口（订阅 7 天，PDF 失败 24h）
- 退款方式（原路返回，5-10 工作日）
- 滥用退款的处理（多次退款 → 账号封禁）

---

## 工单数据模型（已固化）

`support_tickets` 表 8 类 category：
- `reading_inaccurate` —— AI 解读不准 / 幻觉
- `unhappy_result` —— 不喜欢命理结果（情感伤害）
- `pdf_failed` —— PDF 生成失败 / 慢
- `payment_issue` —— 订阅 / 支付
- `refund_request` —— 退款申请
- `legal_regulatory` —— 法律 / 监管 / Apple Legal（**最高优先级**）
- `abuse_threat` —— 恶意 / 威胁
- `other`

priority 1 = 最高（legal / abuse 必须 1）；priority 3 = 默认。

---

## 命理类特殊场景

**"AI 说我今年破财，你赔我"**：
- ❌ 不要做：争论命理对错（你赢不了）；直接退款（鼓励恶意）；删除账号（触发投诉）
- ✅ 应该做：
  - 共情第一句："理解您看到这样结果会感到不安"
  - 重申免责（链接 ToS）
  - 必要时送 1 次免费解读，不退订单

**"AI 说我命短" 类高敏感**：
- 立即升级 priority=1
- 检查 readings 是否触发红线检测但未拦住
- 真实失误 → 立即退款 + 紧急升级红线规则
- 邮件附心理援助热线（北美：988）

---

## SLA 监控（PostHog）

| 指标 | 目标 | 告警 |
|------|------|------|
| 24h 首响率 | ≥ 95% | < 90% 邮件 admin |
| 72h 闭环率 | ≥ 80% | < 70% 暂停 Sprint，全力处理积压 |
| 退款率（按销售单数） | < 5% | > 10% 立即审查产品 |
| Chargeback 率 | < 1% | > 1% 触发 Stripe Radar |

---

## 客服工具（按 Sprint 渐进）

| Sprint | 工具 |
|--------|------|
| 1 | Gmail + Labels + 自建 admin 页 |
| 2 | Plain.com / Help Scout 免费档 + Crisp.chat |
| 3+ | Zendesk / Front |

❌ 不上 OneTrust / Intercom / Zendesk 在 Sprint 1（学习成本高，月费贵）

---

## 危机响应（5 类）

详见 `docs/PLAN.md` §14.5。Sprint 1 必须脑里有数：

| 危机 | < 1h 立即动作 |
|------|--------------|
| 监管 / Apple Legal | 不回复实质内容，先 ack 收到，发律师 |
| Apple 政策违规 | 阅读 reviewer notes，对照 §11.8 应对 |
| 媒体负面 | 不公开回应，私信记者提供事实 |
| 恶意用户 | 屏蔽（profile.status='blocked'）+ 保留证据 |
| Chargeback 风暴 | 暂停付费投放，找出爆发源 |
