# Supabase Project

This directory hosts:
- `migrations/` — SQL migrations (see `.trellis/spec/supabase/migrations.md`)
- `functions/` — Edge Functions in Deno (see `.trellis/spec/supabase/edge-functions.md`)

Bootstrap will be performed in task `04-30-supabase-init`. Do not commit raw `.sql` here until that task starts (current placeholder).

## Local commands

```bash
supabase init                # one-time, generates config.toml
supabase start               # start local stack (Postgres, Auth, Storage, Realtime)
supabase db reset            # rerun all migrations cleanly
supabase functions serve     # serve all Edge Functions
supabase functions deploy <name> --project-ref <ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Function naming

Each function lives in its own directory: `functions/<name>/index.ts`.
Shared helpers go under `functions/_shared/` (imported via relative path).
