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

---

## 历史教训 (Session 4, 2026-05-12)

### Lesson 1: 约束要放在 system + user 双层

**症状**：reading endpoint 系统 prompt 写了「只基于提供的命盘作答」「信息不足要说证据不足」，但 AI 仍稳定虚构大运（同样命盘多次跑出不同的大运干支：丙申 vs 辛巳）。

**根因**：用户 prompt 模板里写了「**结合大运与流年取用**」—— 等于反过来命令 AI **必须**用大运。当 system 与 user 冲突时，**DeepSeek 倾向于服从 user**。

**修复**：
- system 加 `【数据约束（严格）】` 块，列出禁止编造的字段
- 同时改 user 模板，把「结合大运取用」改成「**如 input 提供大运**则结合应期，否则仅作方向性提示」
- 每个 section 写明 fallback 措辞

**通用化**：任何关键约束都要双层落地。只有 system 写，user 一句话就可能推翻。

### Lesson 2: 深嵌套数据 = LLM 看不到

**症状**：扩 smoke 让真实引擎计算 chart_data（包含 `luckInfo.cycles[]` 13 个大运），AI 仍写「input 未提供大运」。

**根因**：cachePrefix 把整个 chart_data dump 成 JSON。luckInfo 在 `chart_data.bazi.luckInfo.cycles[i].ganZhi`，4 级深嵌套。LLM 不会去字段名搜索 JSON 结构 —— 它扫文本表面找「大运」字面，没找到就走 fallback 分支。

**修复**：`buildChartCachePrefix` 提取 `extractBaziSummary()`，把关键字段拍平成可读文本：
```
命盘要点：
四柱：年柱 乙亥，月柱 壬午，日柱 丁丑，时柱 丙午
日主：丁（阴火）
五行力量：金10%、木12%、水13%、火40%、土25%
大运（共 13 步）：
  甲申 1995-2001
  ...
  戊寅 2028-2038
流年（最近 12 年）：
  2025 乙巳（伤官/正印）
  ...
```

LLM 现在直接引用 "戊寅大运 (2028-2038年)、34-44岁" —— 不再 fallback。

**通用化**：给 LLM 的上下文要**双轨**——结构化原始数据（machine-readable）+ 人类可读摘要（LLM-readable）。RAG 系统、tool call 结果同理。

### Lesson 3: smoke 要用真实数据流

**症状**：早期 smoke 脚本手写了一个简化 chart_data（只 8 个干支 + 五行%），跑通了但**完全掩盖**了上面两个 bug。直到换成 `baziCalculator.calculateBazi()` 才暴露。

**通用化**：端到端测试要走**真实数据生成路径**，不能图省事 mock 简化版。否则集成 bug 只能在生产暴露。
