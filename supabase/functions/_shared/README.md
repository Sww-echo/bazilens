# `_shared/` — Edge Function utilities

Shared TypeScript modules imported by Edge Functions. Spec: `.trellis/spec/supabase/edge-functions.md` + `.trellis/spec/supabase/llm-routing.md`.

Pending implementations (task `04-30-shared-utilities`):

| File | Purpose |
|------|---------|
| `cors.ts` | CORS headers + JSON helper + JWT user lookup |
| `llm.ts` | Three-model routing + fallback (Claude → GPT-4.1 → DeepSeek) |
| `crypto.ts` | AES-256-GCM PII encryption with key versioning |
| `pii-sanitize.ts` | Regex PII detection (block PII before DeepSeek calls) |
| `cost.ts` | Provider-specific cost computation |
| `prompts.ts` | Prompt template assembly + cache prefix |
| `auth.ts` | JWT validation helper (separate from frontend client) |
| `quota.ts` | Quota deduction + rollback wrappers |
