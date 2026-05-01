-- =============================================================================
-- 0001_init.sql
-- Base schema for BaziLens.
-- See docs/TECH_SPEC.md §2 + §3 + .trellis/spec/supabase/migrations.md.
--
-- Tables: profiles, charts, readings, usage_quotas, subscriptions,
--         reports, prompt_versions
-- =============================================================================

-- Used by updated_at triggers below (Supabase ships this extension).
create extension if not exists moddatetime schema extensions;
create extension if not exists pgcrypto;

-- =============================================================================
-- 1. profiles  (1:1 with auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  locale text default 'zh-CN' check (locale in ('zh-CN','zh-TW','en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

-- =============================================================================
-- 2. charts
-- =============================================================================
create table if not exists public.charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null check (type in (
    'bazi','ziwei','liuyao','meihua','qimen','liuren','tarot','ssgw'
  )),
  title text not null,
  -- input_data shape (jsonb):
  --   For bazi/ziwei: { solar_year, solar_month, solar_day, hour_index,
  --                     timezone, gender, calendar, true_solar?,
  --                     birth_time_enc, birth_place_enc }
  --   The encrypted fields hold AES-GCM ciphertext (see .trellis/spec/guides/privacy-pii.md).
  --   Plaintext birth_time / birth_place MUST NOT be stored here.
  input_data jsonb not null,
  chart_data jsonb not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists charts_updated_at on public.charts;
create trigger charts_updated_at before update on public.charts
  for each row execute function extensions.moddatetime(updated_at);

create index if not exists charts_user_created on public.charts (user_id, created_at desc);
create index if not exists charts_user_type on public.charts (user_id, type);

-- =============================================================================
-- 3. prompt_versions
-- =============================================================================
create table if not exists public.prompt_versions (
  id text primary key,                -- 'bazi-marriage-v1', 'bazi-pdf-overview-v1', ...
  scene text not null,                -- marriage / career / wealth / pdf-overview / ...
  category text not null,             -- bazi | ziwei | divination | bazi-pdf | ...
  template text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists prompt_versions_scene on public.prompt_versions (scene, category)
  where active = true;

-- =============================================================================
-- 4. readings (AI streaming responses)
-- =============================================================================
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  chart_id uuid references public.charts on delete set null,
  scene text not null,
  -- question_enc: AES-GCM ciphertext of user's question (see crypto.ts).
  -- Legacy 'question' column intentionally omitted.
  question_enc text,
  prompt jsonb not null,              -- { template_id, rendered }
  prompt_version text not null,
  response text,
  model text,                         -- 'claude:claude-sonnet-4-5-20250929' | 'openai:gpt-4.1' | ...
  tokens_input int default 0,
  tokens_output int default 0,
  cache_read_tokens int default 0,
  cost_usd numeric(10,6) default 0,
  status text not null default 'pending' check (
    status in ('pending','streaming','completed','failed')
  ),
  error_message text,
  rating smallint check (rating between 1 and 5),
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists readings_user_created on public.readings (user_id, created_at desc);
create index if not exists readings_chart on public.readings (chart_id);
create index if not exists readings_low_rating on public.readings (rating, created_at desc)
  where rating is not null and rating <= 2;

-- =============================================================================
-- 5. usage_quotas
-- =============================================================================
create table if not exists public.usage_quotas (
  user_id uuid primary key references public.profiles on delete cascade,
  period_start date not null,
  readings_used int not null default 0,
  pdf_reports_used int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists usage_quotas_updated_at on public.usage_quotas;
create trigger usage_quotas_updated_at before update on public.usage_quotas
  for each row execute function extensions.moddatetime(updated_at);

-- =============================================================================
-- 6. subscriptions
-- =============================================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles on delete cascade,
  tier text not null default 'free' check (tier in ('free','plus','pro')),
  source text check (source in ('stripe','revenuecat')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  revenuecat_app_user_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  status text not null default 'active' check (
    status in ('active','canceled','past_due','trialing','expired')
  ),
  cancel_at_period_end boolean not null default false,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer on public.subscriptions (stripe_customer_id);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function extensions.moddatetime(updated_at);

-- =============================================================================
-- 7. reports (PDF detailed reports — see TECH_SPEC §14 + §13.7)
-- =============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  chart_id uuid not null references public.charts on delete cascade,
  type text not null check (type in (
    'full_bazi','liunian','compatibility','ziwei_full'
  )),
  status text not null default 'pending' check (
    status in ('pending','paid','generating','ready','failed','refunded')
  ),
  -- Progress + intermediate sections data
  progress smallint not null default 0 check (progress between 0 and 100),
  sections jsonb,
  -- Payment
  paid_at timestamptz,
  amount_usd numeric(10,2),
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text,
  -- Output
  pdf_url text,
  pdf_size_bytes int,
  -- Model + cost
  model_used text,                   -- 'claude' | 'claude→openai' | 'gpt-4.1'
  total_tokens_input int not null default 0,
  total_tokens_output int not null default 0,
  total_cost_usd numeric(10,6) not null default 0,
  -- Quality + feedback
  quality_score smallint,            -- 0-100; < 60 fails redline check
  user_rating smallint check (user_rating between 1 and 5),
  user_feedback text,
  -- Refund
  refund_id text,
  refund_amount_usd numeric(10,2),
  refund_reason text,
  refunded_at timestamptz,
  -- Errors
  error_message text,
  retry_count smallint not null default 0,
  -- Timestamps
  created_at timestamptz not null default now(),
  generation_started_at timestamptz,
  ready_at timestamptz
);

create index if not exists reports_user_created on public.reports (user_id, created_at desc);
create index if not exists reports_status on public.reports (status)
  where status in ('paid','generating','failed');
create index if not exists reports_stripe_session on public.reports (stripe_checkout_session_id);

-- =============================================================================
-- 8. handle_new_user — auto-create profile + quota + subscription on signup
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'locale', 'zh-CN')
  )
  on conflict (id) do nothing;

  insert into public.usage_quotas (user_id, period_start)
  values (new.id, date_trunc('month', now())::date)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, tier)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 9. RLS policies
-- =============================================================================
alter table public.profiles         enable row level security;
alter table public.charts           enable row level security;
alter table public.readings         enable row level security;
alter table public.usage_quotas     enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.reports          enable row level security;
alter table public.prompt_versions  enable row level security;

-- profiles: own row read/write; admins read all
drop policy if exists "own profile rw"  on public.profiles;
drop policy if exists "admin read profiles" on public.profiles;
create policy "own profile rw" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin read profiles" on public.profiles
  for select using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- charts: own row CRUD
drop policy if exists "own charts" on public.charts;
create policy "own charts" on public.charts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- readings: read-only by user; rating update only; insert/full update via service_role
drop policy if exists "read own readings"  on public.readings;
drop policy if exists "rate own readings"  on public.readings;
create policy "read own readings" on public.readings
  for select using (auth.uid() = user_id);
create policy "rate own readings" on public.readings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage_quotas: read-only by user (writes via consume/rollback RPC as security definer)
drop policy if exists "read own quota" on public.usage_quotas;
create policy "read own quota" on public.usage_quotas
  for select using (auth.uid() = user_id);

-- subscriptions: read-only by user
drop policy if exists "read own sub" on public.subscriptions;
create policy "read own sub" on public.subscriptions
  for select using (auth.uid() = user_id);

-- reports: read-only by user; rating update; writes via service_role
drop policy if exists "read own reports" on public.reports;
drop policy if exists "rate own reports" on public.reports;
create policy "read own reports" on public.reports
  for select using (auth.uid() = user_id);
create policy "rate own reports" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- prompt_versions: anyone can read active templates
drop policy if exists "anyone read active prompts" on public.prompt_versions;
create policy "anyone read active prompts" on public.prompt_versions
  for select using (active = true);
