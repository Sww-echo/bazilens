# Reading Edge Function (Three-Model Streaming)

## Goal

实现 `/reading` Edge Function：用户 POST 命盘 + 场景，函数完成 PII 守门 → 配额扣减 → 模型路由 → SSE 流式输出 → 持久化 reading 行 + 质量分。

> 详见 `.trellis/spec/supabase/edge-functions.md` "reading"。

---

## Scope

### In Scope（`supabase/functions/reading/index.ts`，242 行）

1. **入口与鉴权**
   - [x] `withCors` + `requireAuth` 包装
   - [x] Body 校验：`chart_id` `scene` `prompt_version`，可选 `question`

2. **PII 守门（仅 Free 档）**
   - [x] 用户档位查 `subscriptions.tier`
   - [x] Free 档：question 过 `pii-sanitize.ts`，命中返 422

3. **配额扣减（pre-flight）**
   - [x] 调 `consumeReading()` RPC 原子扣
   - [x] 配额耗尽返 402

4. **命盘载入**
   - [x] `charts` 表读 `chart_data`
   - [x] 走 `decryptPII()`（如 reading 需要 birth_time/place 上下文）

5. **提示词加载与缓存**
   - [x] `prompts.ts` 按 `prompt_version` + `scene` 取模板
   - [x] System + 命盘事实 → cache prefix
   - [x] 用户 question → cache 之后

6. **三模型路由 + 流式**
   - [x] `routeLLM(tier, ...)` 自动按档位选模型
   - [x] SSE：每个 token 作为 `data: {type:"delta",text:"..."}\n\n`
   - [x] 完成时 `data: {type:"done",reading_id,fell_back,quality_score}\n\n`
   - [x] 错误：`data: {type:"error",message:"..."}\n\n`

7. **失败回滚**
   - [x] LLM 全员 fallback 失败 → `rollbackReading()` 不计入配额
   - [x] `fell_back=true` 时，根据策略决定是否计入（spec：不计）

8. **持久化**
   - [x] insert `readings` 行：scene / prompt_version / model / status='completed' / cost_usd / quality_score
   - [x] 评分 RPC（前端 POST `/readings/:id/rate` → 单独 SQL update）

### Out of Scope

- ❌ 评分 endpoint（前端直 update via RLS）
- ❌ `redline.ts` 评分逻辑（在 `_shared` 任务里）

---

## DoD

- [x] `supabase/functions/reading/index.ts` 存在
- [x] 至少 1 条 happy path（curl 测）走完 → DB 看到新 reading 行
- [x] 模型 fallback 触发后 `fell_back=true` 且配额未扣
- [x] PII 命中返 422 不进 LLM
- [x] 配额耗尽返 402 不进 LLM
- [x] CORS 正确，前端 `streamReading()` 可消费

---

## Key References

- `docs/TECH_SPEC.md` §8.4（reading endpoint 详细流程）
- `.trellis/spec/supabase/edge-functions.md`
- `src/api/readings.ts`（前端消费方）

---

## Notes

- 实现完成于 commit `b451592`。
- 前端 `useReading` hook 已对接：状态机 idle → streaming → done/error。
- `done` 事件中的 `quality_score` 由 `_shared/redline.ts` 启发式给出（0-100）。
