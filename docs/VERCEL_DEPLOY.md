# Vercel Deployment

> Reference for configuring the Vercel project. Once `.env.local` works against
> the linked Supabase project, deploying to Vercel is mostly env-var transcription.

## One-time setup

1. **Create project**: import `Sww-echo/bazilens` from the Vercel dashboard.
   Framework auto-detects as **Vite** (`vercel.json` pins this).
2. **Build settings** — leave at defaults; `vercel.json` already sets them:
   - Build command: `npm run build`
   - Output: `dist`
   - Install: `npm ci --no-audit --no-fund`
3. **Domains** — when you register `bazilens.com` (or `.app`), add it via
   Project → Settings → Domains and point DNS to Vercel.

## Environment variables (Project → Settings → Environment Variables)

Copy from `.env.local` in your Vercel project, scope `Production` + `Preview`:

| Key | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://thsxfuvbawnfajjpxfra.supabase.co` | Same across envs |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon role) | Public, safe in client bundle |
| `VITE_APP_URL` | `https://bazilens.com` (prod) / preview URL | Used for OAuth redirects + Stripe success URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` / `pk_test_...` | After Stripe KYC |
| `VITE_SENTRY_DSN` | `https://...ingest.sentry.io/...` | After Sentry project |
| `VITE_POSTHOG_KEY` | `phc_...` | After PostHog project |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | Default fine |

**Do NOT** put `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, etc. in Vercel
— those live in Supabase Edge Function secrets (`supabase secrets set`).

## Post-deploy checklist

- [ ] Open `https://<project>.vercel.app/` — landing renders, NavBar + BottomTabs visible after sign-in.
- [ ] `/.well-known/security.txt` (optional, future).
- [ ] Supabase Auth → URL Configuration:
  - Site URL → `https://bazilens.com`
  - Additional Redirect URLs → `https://bazilens.com/auth/callback`, preview URLs.
- [ ] Update Edge Function secret `APP_URL` + `CORS_ALLOW_ORIGIN` to prod domain:
  ```
  npx supabase secrets set APP_URL=https://bazilens.com CORS_ALLOW_ORIGIN=https://bazilens.com
  ```
- [ ] Redeploy `reading` / `checkout` / `chart-create` Edge Functions to pick up new CORS origin.
- [ ] Sanity: open Network tab on landing, confirm Supabase client uses production URL.

## Headers / security (configured in `vercel.json`)

- `/assets/*` → `Cache-Control: public, max-age=31536000, immutable` (Vite hashes assets, safe to cache forever).
- All routes →
  - `X-Frame-Options: DENY` (clickjack)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

## SPA fallback

`rewrites` send any non-asset path to `/index.html` so React Router handles
deep links (`/chart/abc123`, `/account`, etc.) on first load.
