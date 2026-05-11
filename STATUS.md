# BaziLens · Sprint 0 Build Status

> Snapshot of what's been built vs. what's pending. Updated in-tree so any
> future Claude / Cursor session can pick up without recovering context.

Last updated: 2026-05-11

---

## ✅ Done

### Documentation
- `docs/PLAN.md` (1380 lines) — product / commercial / sprints / compliance
- `docs/TECH_SPEC.md` (1850 lines) — DDL / Edge Function / 3-model routing / PDF / privacy
- `.trellis/spec/` — 13 spec files distilled from the docs above:
  - `guides/`: product-overview, sprint-roadmap, privacy-pii, apple-review, ai-quality-eval, customer-support
  - `frontend/`: index, directory-structure, state-management, type-safety
  - `supabase/`: index, llm-routing, migrations, edge-functions

### Frontend scaffolding (`src/`)
- API surface (`src/api/`):
  - `client.ts` — Supabase client singleton with env validation
  - `auth.ts` — magic link / Google OAuth / Apple OAuth / signOut
  - `charts.ts` — createChart (via `/chart-create` Edge Fn) / list / get / favourite / delete
  - `readings.ts` — `streamReading()` async generator + listReadings + rateReading
  - `subscriptions.ts` — fetch / startSubscriptionCheckout / startPDFCheckout / openCustomerPortal
  - `reports.ts` — list / get / signed download URL / Realtime progress / rate
  - `tickets.ts` — createTicket / listMyTickets
- Engine bridge (`src/lib/chart-builders.ts`) — wraps mingyu `calculateFullBaziChart` + `calculateFullZiweiChart` into `CreateChartInput` payload, routing PII fields to server-side encryption
- Hooks (`src/hooks/`):
  - `useReading` — drives streaming SSE
  - `useReportProgress` — live PDF progress + auto signed URL
  - `useSubscription` — sync subscription row + push to Zustand
  - `useCharts` — list / mutate user charts
- Zustand stores: authStore, subscriptionStore, quotaStore, consentStore
- i18n setup with zh-CN + zh-TW locales (en pending Sprint 2)
- Type stubs: `database.types.ts` (placeholder until `supabase gen types`), `api.types.ts`
- Placeholder App.tsx / main.tsx (UI page implementations待 UI 稿)
- All mingyu engines preserved untouched:
  - `src/utils/bazi/` (31 files)
  - `src/lib/divination/` (six divination algorithms — Sprint 2)
  - `src/lib/iztro/` + `src/lib/full-chart-engine.ts`
  - `src/utils/{tarot,hexagram-data,ssgw-data}.ts`
  - `src/services/prompts/shared/question-analyzer.ts`

### Frontend UI (`src/pages/` + `src/components/`)
Mobile-first rebuild driven by `docs/ui/` mockups (commits `22d58aa`, `97a62ce`).
- Layout system: route-aware `Layout` switches NavBar / BottomTabs / Footer; new `BottomTabs` component (app + admin variants); new `UpgradeModal`.
- 12 pages built / rebuilt:
  - Public: `LandingPage`, `DisclaimerPage`
  - Auth: `SignInPage` (magic-link + Google + Apple)
  - Onboarding: `OnboardingPage` (3-step Welcome / Quick Chart / Sample Reading; auto-redirect via `OnboardingGate`, skippable, `localStorage` flag)
  - Chart: `ChartListPage`, `ChartNewPage` (BaZi/紫微/合 + true-solar option), `ChartDetailPage` (4-pillar grid + 五行 SVG donut, reads real `chart_data`)
  - Reading: `ReadingListPage`, `ReadingNewPage` (scene pills + 总览 card + 5-star rating + UpgradeModal on quota exhaustion)
  - Report: `ReportListPage`, `ReportDetailPage` (status / progress / ready / failed)
  - Account: `AccountPage` (profile + avatar from `user_metadata` + subscription + quota + privacy/data + delete)
  - Upgrade: `UpgradePage` (Monthly/Annual toggle, 3 tiers, one-time PDF, FAQ)
  - Admin: `TicketsPage`, `StatusPage`

### Frontend infrastructure
- `ErrorBoundary` — catches render errors, reports to Sentry, branded fallback UI with reload + go-home buttons (dev mode shows stack).
- `Toast` system — provider + `useToast` hook, auto-dismiss 4.5s, replaces native `alert()`.
- `lib/observability.ts` — Sentry + PostHog init gated by `consentStore` (no init unless user opts in; re-evaluates on consent change).
- i18n — 3 locales (zh-CN / zh-TW / en), 9 namespaces (`landing` / `signIn` / `chart` / `reading` / `upgrade` / `account` / `tickets` / `onboarding` / `error`), `Trans` interpolation for SignIn link composition.
- Typecheck — strict mode passes (0 errors); legacy mingyu engine isolated via `noUnusedLocals=false` + targeted excludes.

### Backend (`supabase/`)
- `config.toml` (Auth + OAuth Google/Apple + Storage)
- `seed.sql` (`reports` Storage bucket + 7 PDF prompt placeholders)
- 4 migrations:
  - `0001_init.sql` — profiles + charts + readings + usage_quotas + subscriptions + reports + prompt_versions + RLS + handle_new_user
  - `0002_quota_rpc.sql` — consume_reading_quota / rollback_reading_quota / consume_pdf_quota
  - `0003_support_tickets.sql` — support_tickets + SLA view + RLS
  - `0004_privacy_compliance.sql` — profiles status/scheduled_delete/consent + incidents table + auth.users.email sync trigger

### Edge Functions (`supabase/functions/`)
- `_shared/cors.ts` — CORS, JSON helper, `requireAuth`, `serviceClient`
- `_shared/llm.ts` (326 lines) — three-model routing with fallback (Claude → GPT-4.1 → DeepSeek), Anthropic prompt cache
- `_shared/crypto.ts` — AES-256-GCM PII encryption with key versioning
- `_shared/pii-sanitize.ts` — regex PII detection (gates Free → DeepSeek)
- `_shared/cost.ts` — provider-specific cost computation (Q1-2026 pricing)
- `_shared/redline.ts` — quality scoring + disclaimer injection
- `_shared/prompts.ts` — template loader + cache prefix builder + system prompt
- `_shared/quota.ts` — RPC wrappers
- `chart-create/index.ts` — server-side encrypted chart insertion (PII boundary)
- `reading/index.ts` (242 lines) — streaming SSE with PII guard, fallback rollback
- `checkout/index.ts` — Stripe Checkout (subscription + PDF dual-track) + Customer Portal helper
- `stripe-webhook/index.ts` (219 lines) — sub events + PDF payment → triggers report-generate
- `report-generate/index.ts` (352 lines) — async PDF pipeline: chapter orchestration → render → Storage → Resend email
- `report-generate/chapters.ts` — 7-chapter BaZi report definitions
- `report-generate/pdf-render.tsx` — react-pdf template (cover + chapters + appendix + bilingual disclaimer)
- `data-export/index.ts` — GDPR Art. 15 (decrypts PII for self-export)
- `account-delete/index.ts` — schedules 30-day grace + cancels Stripe + global signout + email
- `scheduled-purge/index.ts` — daily cron, hard-deletes expired accounts (anonymizes financials)

**Total: ~2,400 lines of Edge Function code, 4 migrations, 8 functional endpoints.**

### CI / DevX
- `.github/workflows/ci.yml` — typecheck + tests (`tsx --test`) + Vite build run on push/PR (Node 20.x, all green on `fe7cfa6`).
- Test cleanup — removed 18 mingyu-era tests that referenced deleted UI source files or assertions against the old `styles.css` rules; remaining 21 test files / 397 tests (bazi engine + divination algorithms) all pass.

### Trellis tasks (planning state)
- `04-30-bootstrap-rebrand` — prd + implement.jsonl filled
- `04-30-supabase-init` — implementation done in tree, **prd written**
- `04-30-shared-utilities` — implementation done in tree, **prd written**
- `04-30-reading-edge-function` — implementation done in tree, **prd written**
- `04-30-stripe-checkout-webhook` — implementation done in tree, **prd written**
- `04-30-pdf-report-generate` — implementation done in tree, **prd written**
- `04-30-privacy-compliance` — implementation done in tree, **prd written**

---

## ⏳ Pending — needs user action (cannot be automated)

External account / key provisioning. None of these can be done by Claude on
behalf of the user.

- [x] **Supabase project** — `thsxfuvbawnfajjpxfra` (sww, ap-northeast-2, PG17). URL + ANON_KEY + SERVICE_ROLE_KEY in `.env.local` / `.env.functions.local`. Linked, migrated, deployed, seeded.
- [ ] Apply for Anthropic API ($10 starter)
- [ ] Apply for OpenAI API + request **Zero Data Retention** (`zdr@openai.com`)
- [x] **DeepSeek API key** — `DEEPSEEK_API_KEY` set as Supabase secret.
- [ ] Register Stripe (Web KYC; bank account / Wise; W-8BEN tax form)
- [ ] **Apply for Apple Developer ($99 — submit Day 1, takes 1-2 days)**
- [ ] Register Resend account, verify sending domain
- [ ] Register Sentry + PostHog (free tiers)
- [ ] Register Vercel
- [ ] Register social accounts: 小红书海外 + Twitter/X + 公众号订阅号
- [ ] **Domain**: register `bazilens.com` (or fallback `bazilens.app`); configure DNS once Vercel project exists
- [ ] **Trademark check**: USPTO + EUIPO search for "BaziLens"
- [x] **`PII_ENCRYPTION_KEY`** generated and set as Supabase secret.
- [x] **`CRON_SECRET`** generated and set as Supabase secret.
- [ ] Create Stripe Products + Prices and tag with lookup_keys:
  - `plus_monthly` ($4.99) / `plus_yearly` ($39.99)
  - `pro_monthly` ($9.99) / `pro_yearly` ($79.99)
  - `pdf_full_bazi` ($14.99)
- [ ] Configure Supabase Auth providers: enable Google + Apple OAuth, add redirect URLs
- [ ] Termly draft + publish Privacy Policy + Terms of Service URLs
- [ ] Collect 20-pole golden test set (`.trellis/spec/guides/ai-quality-eval.md` §"Golden Test Set")
- [ ] Write first SEO blog post draft (4000+ words)

---

## ⏳ Pending — implementation work

These can be done in future sessions. Numbered in suggested execution order:

### Frontend follow-ups (post-UI)
~~22. i18n alignment — new pages contain inline EN/CN strings; consolidate into `react-i18next` keys.~~ — done (3 locales × 9 namespaces; SignIn / Account / Upgrade / Tickets / Landing / Footer / Reading / Onboarding wired).
23. Browser smoke tests of golden paths (signup → chart → reading → report → upgrade).
~~24. Replace SVG avatar placeholder in `AccountPage` with `auth.user.user_metadata.avatar_url`.~~ — done (with initials fallback).
25. Wire `/admin/status` to real Supabase health rather than hardcoded service rows. **Blocked on Supabase project provisioning.**
26. UI tests (React Testing Library) — currently 0 coverage.

### Frontend follow-ups (newly surfaced)
- TicketsPage card-level copy still hardcoded EN; rest of the page is i18n-wired.
- Suspense fallback `加载中…` is plain text — could brand with skeleton.
- Onboarding step 3 uses pre-rendered sample text; revisit if real-LLM preview becomes affordable.

### Bootstrap completion
1. Run `npm install` and verify `npm run typecheck` passes (will likely surface
   strict-mode issues in placeholder code; address inline).
2. Add `tsconfig.app.json` strict-mode flags per
   `.trellis/spec/frontend/type-safety.md`.

### Supabase end-to-end
~~3. `supabase init` (locally) and `supabase link --project-ref <ref>`~~ — done; linked to `thsxfuvbawnfajjpxfra`.
~~4. `supabase db push` to deploy migrations to remote~~ — done; 4/4 migrations applied (0001_init / 0002_quota_rpc / 0003_support_tickets / 0004_privacy_compliance). `seed.sql` also applied (reports bucket + 7 prompt placeholders).
~~5. `supabase functions deploy reading checkout stripe-webhook report-generate data-export account-delete scheduled-purge`~~ — done; 8/8 functions ACTIVE (also includes chart-create).
6. `supabase secrets set` — partial. Done: APP_URL, CORS_ALLOW_ORIGIN, CRON_SECRET, PDF_SIGNED_URL_TTL_SECONDS, PII_ENCRYPTION_KEY, PII_KEY_VERSION, **DEEPSEEK_API_KEY**. Still needed: ANTHROPIC_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY.
~~7. Run `npm run supabase:types` to regenerate `src/types/database.types.ts`~~ — done (1186 lines from live schema; replaces hand-rolled placeholder). Script also updated `--local` → `--linked`.
8. End-to-end smoke test:
   - chart-create gates 401 without user JWT ✓ (auth wall works)
   - scheduled-purge gates 403 without CRON_SECRET ✓ (signature wall works)
   - signup → magic link → profile auto-created — **not run** (needs browser)
   - create chart → see in DB (encrypted fields opaque) — **not run** (needs user JWT)
   - call `/reading` with curl → SSE flows — pending; DeepSeek key now in place so free-tier path is unblocked, just need a chart row + user JWT.
   - Stripe Checkout PDF → webhook → report-generate — pending Stripe keys.
   - download PDF from emailed signed URL — pending Resend.

### Frontend (waits on UI design)
~~9. Onboarding flow + cookie consent~~ — basic CookieConsent shipped; onboarding still spartan
~~10. Magic Link / Google / Apple sign-in pages~~ — done (`SignInPage`)
~~11. Chart input form (BaZi + Ziwei) wired to `src/api/charts.ts`~~ — done (`ChartNewPage`, `ChartListPage`, `ChartDetailPage`)
~~12. Streaming reading UI (consume `streamReading` async generator)~~ — done (`ReadingNewPage`, `ReadingListPage`)
~~13. Subscription / upgrade flow (call `/checkout`)~~ — done (`UpgradePage`, `UpgradeModal`)
~~14. PDF purchase + progress page (Realtime subscription on `reports`)~~ — done (`ReportListPage`, `ReportDetailPage`)
~~15. Account / Subscription / Privacy / Settings pages~~ — done (`AccountPage`)
~~16. Admin tickets page~~ — done (`TicketsPage`, `StatusPage` stub)

### Operations
17. Font subsetting CI script (`scripts/build-font-subset.sh`)
~~18. GitHub Actions: lint + typecheck + supabase migration linter~~ — typecheck + tests + vite build shipped (`.github/workflows/ci.yml`); migration linter still TODO.
19. Vercel deployment
20. Schedule daily cron for `scheduled-purge` (Supabase pg_cron or external)
~~21. Configure Sentry + PostHog projects (DSN values in `.env`)~~ — code wired (`lib/observability.ts`); awaits user's account creation + DSN values.

---

## 🔒 Known constraints

- ~~Git commits not yet authored (git identity not set in this session). User should run `git config user.name "..." && git config user.email "..."` and then `git checkout -b feat/sprint-0-bootstrap && git add -A && git commit`.~~ — git identity configured; commits authored on `main`.
- `node_modules/` not installed — `npm install` will be needed before
  `npm run dev` / `npm run typecheck`.
- Edge Function bundle size: `report-generate` pulls in `@react-pdf/renderer`
  + `resend` + `stripe`; verify size stays under Supabase 50MB limit when
  deploying.
- DeepSeek API: data residency in mainland China. Free tier is the ONLY
  user-facing surface allowed to send to DeepSeek, and only after
  `pii-sanitize.ts` regex pass clears the input.
