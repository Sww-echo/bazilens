# Build `_shared` Edge Function Utilities

## Goal

为所有 Edge Function 提供统一的工具层：CORS / 鉴权 / 三模型路由 / PII 加密 + 检测 / 配额 RPC / 成本核算 / 提示词加载 / 质量分。

> 详见 `.trellis/spec/supabase/edge-functions.md` + `.trellis/spec/supabase/llm-routing.md` + `.trellis/spec/guides/privacy-pii.md`。

---

## Scope

### In Scope（`supabase/functions/_shared/`）

1. **`cors.ts`**
   - [x] `withCors(req, handler)` 包装，处理 OPTIONS 预检
   - [x] `requireAuth(req)` 校验 Bearer JWT，返回 user 或 401
   - [x] `serviceClient()` —service-role Supabase 客户端
   - [x] `json(data, status)` helper

2. **`llm.ts`**（326 行）
   - [x] `routeLLM(tier, input)` 三模型路由：Pro → Claude Sonnet 4.6 → GPT-4.1 → DeepSeek
   - [x] Anthropic prompt cache 注入（system + tools 块标 `cache_control`）
   - [x] SSE 流式封装（统一 yield `delta` / `done` / `error` 事件）
   - [x] Fallback 触发条件：429 / 5xx / timeout 5s
   - [x] `fell_back: true` 标记携带到 done 事件
   - [x] OpenAI 走 ZDR endpoint（如已申请）

3. **`crypto.ts`**
   - [x] AES-256-GCM 加密 / 解密 PII 字段（birth_time / birth_place）
   - [x] Key 版本号头：`v{N}:{nonce}:{ciphertext}` 支持轮换
   - [x] 从 `PII_ENCRYPTION_KEY` + `PII_KEY_VERSION` env 读取

4. **`pii-sanitize.ts`**
   - [x] 正则检测 Email / 手机号 / 身份证 / 信用卡 / 详细地址
   - [x] Free 档发 DeepSeek 前必过；命中拒绝（HTTP 422）

5. **`cost.ts`**
   - [x] 每个 provider 的 input/output 单价（Q1-2026）
   - [x] `computeCost(provider, model, in_tokens, out_tokens)`
   - [x] 写入 `readings.cost_usd`

6. **`redline.ts`**
   - [x] 质量评分启发式（长度、结构、避免确定性词）
   - [x] 自动注入 disclaimer 段（中英）

7. **`prompts.ts`**
   - [x] 从 `prompt_versions` 表加载模板
   - [x] 拼装 cache prefix（system + tools + 命盘事实）
   - [x] 用户问题作为非缓存 suffix

8. **`quota.ts`**
   - [x] `consumeReading(supabase, userId)` → 调 RPC，返回 `{ ok, remaining }`
   - [x] `rollbackReading(supabase, userId)` → 失败时回退（fallback 不计入）
   - [x] `consumePDF(supabase, userId)`

### Out of Scope

- ❌ 实际调用 LLM 的 Edge Function（独立任务，调用 `_shared`）
- ❌ Stripe webhook（独立任务）

---

## DoD

- [x] 8 个文件全部存在于 `supabase/functions/_shared/`
- [x] 任意 Edge Function 可通过 `import { withCors, requireAuth } from '../_shared/cors.ts'` 复用
- [x] `llm.ts` fallback 路径已写完整（不只是 happy path）
- [x] `crypto.ts` key 版本机制就位（即使现在只用 v1）
- [x] `pii-sanitize.ts` 单元 case 全部命中

---

## Key References

- `docs/TECH_SPEC.md` §8（三模型路由）+ §11（PII 加密）+ §9（配额）
- `.trellis/spec/supabase/llm-routing.md`
- `.trellis/spec/supabase/edge-functions.md`

---

## Notes

- 实现完成于 commit `b451592`。
- 任何后续 Edge Function 都应优先复用 `_shared`，不要重复造轮子。
- `redline.ts` 的启发式可后期换成 LLM-judge 评分（需 PLAN §12.4）。
