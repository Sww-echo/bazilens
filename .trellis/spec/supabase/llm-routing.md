# LLM Routing Guidelines

> Three-model routing with fallback. Source: PLAN §9, TECH_SPEC §4.5.

---

## Routing Table

| Tier | Provider | Model | Single Cost (≈) | Monthly Quota |
|------|----------|-------|-----------------|---------------|
| Free | DeepSeek | `deepseek-chat` | $0.002 | 3 readings |
| Plus | OpenAI | `gpt-4.1` | $0.0146 | 30 readings |
| Pro | Anthropic | `claude-sonnet-4-5-20250929` | $0.026 | 200 readings (soft cap) |

Pricing (per MTok input / output):
- Claude $3 / $15 (cache write $3.75, cache read $0.30)
- GPT-4.1 $2 / $8
- DeepSeek $0.27 / $1.10

---

## Fallback Chain

```
Pro Claude 失败 → GPT-4.1
Plus GPT-4.1 失败 → DeepSeek
Free DeepSeek 失败 → 直接 throw（不再降级）
```

Implementation: `supabase/functions/_shared/llm.ts` (TECH_SPEC §4.5)

When fallback occurs:
1. **不扣本档配额**（调 `rollback_reading_quota` RPC）
2. 在 `readings.error_message` 记录降级链：`fallback: claude → openai`
3. 用户体验上无感（只是结果可能稍慢）

---

## DeepSeek PII Boundary（关键合规）

**DeepSeek 数据驻留中国，禁止发送 PII**：

```typescript
// reading/index.ts 调 callLLMStream 前
if (TIER_ROUTE[tier].provider === 'deepseek') {
  const detection = detectPII(question)   // _shared/pii-sanitize.ts
  if (detection.hasPII) {
    return json({
      error: 'pii_detected',
      message: '免费档不支持包含个人信息的问题，请升级 Plus',
      upgrade_url: '/upgrade'
    }, 400)
  }
}
```

命盘数据本身（八字干支）不含 PII（衍生计算，无法逆推到出生时间），可以发送。

---

## Prompt Caching（PDF 多章节生成核心优化）

PDF 生成调用 7 次 LLM 时必须使用 Anthropic prompt cache：

```typescript
// 命盘数据作为 cached prefix（首次 cache write，后续 6 次 cache read 90% 折扣）
await callLLM('pro', {
  prompt: chapterTemplate,      // 章节专属指令
  cachePrefix: chartData,       // 共享，cache_control: ephemeral
  maxTokens: 2000,
})
```

成本对比（7 章 PDF）：
- 不用 cache：~$0.21
- 用 cache：~$0.14（**节省 33%**）

---

## Cost Tracking

每次 LLM 调用必须落库 `readings.cost_usd` 或 `reports.total_cost_usd`：

- 用 `_shared/cost.ts` 的 `computeCost(provider, tokensIn, tokensOut, cacheHit, cacheWrite)`
- 月度成本汇总：`select sum(cost_usd) from readings where date_trunc('month', created_at) = '2026-04-01'`
- PostHog 不要上传 `cost_usd`（敏感商业数据，不外传）

---

## Forbidden Patterns

- ❌ 不通过 `_shared/llm.ts` 直接调用 Anthropic / OpenAI / DeepSeek SDK
- ❌ 在 Plus / Free 路由发送任何带 PII 的内容
- ❌ 不记录 fallback 事件（运维盲区）
- ❌ 用 `model: 'claude-3-5-sonnet'` 等过期 model ID（必须用最新 4.5/4.6 stable IDs）
