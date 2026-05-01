# AI Quality Evaluation

> 命理是内容产品，AI 幻觉一次就流失用户。源：PLAN §12 + TECH_SPEC §14.4。

---

## 三规则红线检测（Edge Function 后处理必装）

任何 AI 输出落库前都要过 `_shared/redline.ts`：

### 规则 1：神煞白名单

只允许 `src/utils/bazi/baziShenSha.ts` 中已定义的 40+ 神煞。AI 输出包含其他词组的"X 星"/"X 煞"/"X 神" → `quality_flag` + 触发告警。

```typescript
const ALLOWED = new Set(['天乙贵人','将星','华盖', /* ... */])
const matched = response.match(/[一-龥]{2,4}(?=星|煞|神)/g) || []
const fabricated = matched.filter(s => !ALLOWED.has(s))
if (fabricated.length > 0) qualityScore -= 30
```

### 规则 2：禁用断言

正则扫描，命中即扣分（满分 100，< 60 视为不合格阻止上线）：

| 模式 | 扣分 | 例 |
|------|------|----|
| `命中缺[金木水火土]` | -20 | "命中缺金"（民间错误说法） |
| `克[夫妻子]` | -25 | "克夫"、"克妻"（情感伤害） |
| `活不过\d+岁` / `\d+岁有大灾` | -30 | 健康 / 死亡预测，触发 Apple 1.4.1 |
| `今年必定` / `一定会` | -15 | 绝对断言 |

PDF `quality_score < 60` → 标记 `failed` + 触发自动退款。

### 规则 3：免责声明强制注入

后处理强制在每段 reading / 每章 PDF 末尾追加：
```
---
本解读基于传统命理研究，仅供文化参考与个人探索，不构成任何专业建议。
```

---

## Golden Test Set（Sprint 0 / Week 0 准备）

20-30 盘标注命盘，每盘附 `expected.json`：

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

采样矩阵（20 盘最低）：
- 建禄/月刃格 × 5（《渊海子平》案例）
- 食神/伤官格 × 5
- 正官/七杀格 × 5
- 财格/印格 × 5
- 从格/化气格 × 3
- 真实用户授权 × 5（自己 + 朋友）

---

## 评分维度（5 维各 1-5 分）

每次 prompt 改动 → 跑全部 20 盘 → 人工对比打分：

1. 用神判断准确度
2. 格局识别准确度
3. 命理幻觉（编造神煞 / 错误术语）
4. 表达专业度（不玄学化）
5. 行动建议可执行性

**晋升门槛**：
- 平均 < 3.5 → 拒绝上线
- 平均 ≥ 4.0 → 灰度 5%（按 user_id hash 分流）
- 灰度累积 100 条 rating，平均 ≥ 旧版 → 晋升 50% → 全量

---

## 在线反馈闭环

每条 reading 完成后 UI 5 星打分（不评分软提示，不阻塞）。

`rating ≤ 2` 自动入 `quality_review_queue` 视图。每周一固定 1 小时 review 上周低分（10-20 条）。

---

## 事故响应（生产 prompt 退化）

| 阶段 | 时限 | 动作 |
|------|------|------|
| 1 分钟 | 立即 | `prompt_versions.active = false` → 全部流量回前一版 |
| 5 分钟 | 立即 | 受影响用户标记，准备退款 / 补单 |
| 1 小时 | 立即 | 写事故 ADR，分析根因 |
| 24 小时 | 立即 | 修复 + 重新评估 + 灰度上线下一版 |

---

## Forbidden

- ❌ 上线新 prompt 不跑 golden set
- ❌ 跳过红线检测直接落库
- ❌ rating ≤ 2 不入 review 队列
- ❌ 不记录 prompt_version 在 readings.prompt_version
