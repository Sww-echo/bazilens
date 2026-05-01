-- =============================================================================
-- 0004_privacy_compliance.sql
-- Privacy / GDPR plumbing. See docs/PLAN.md §15 + docs/TECH_SPEC.md §16
-- + .trellis/spec/guides/privacy-pii.md.
-- =============================================================================

-- profiles: account lifecycle + cookie consent + age confirmation
alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active','paused','pending_deletion'));
alter table public.profiles
  add column if not exists scheduled_delete_at timestamptz;
alter table public.profiles
  add column if not exists consent jsonb not null default '{}'::jsonb;
alter table public.profiles
  add column if not exists age_confirmed_16 boolean not null default false;
alter table public.profiles
  add column if not exists email text;          -- denormalized for purge-time email send

-- Index used by /scheduled-purge cron
create index if not exists profiles_scheduled_delete on public.profiles (scheduled_delete_at)
  where status = 'pending_deletion';

-- =============================================================================
-- incidents — security / breach / DPA notification log
-- =============================================================================
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'breach',           -- confirmed data breach
    'suspected',        -- under investigation
    'near_miss',        -- caught before damage (e.g. cron failure)
    '3rd_party_alert'   -- vendor reported issue (Supabase / Stripe / ...)
  )),
  severity text not null check (severity in ('critical','high','medium','low')),
  detected_at timestamptz not null,
  description text not null,
  affected_user_count int,
  notified_dpa_at timestamptz,
  notified_users_at timestamptz,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists incidents_unresolved on public.incidents (severity, detected_at desc)
  where resolved_at is null;

-- RLS: admin-only (incidents reference internal infra; users never see)
alter table public.incidents enable row level security;
drop policy if exists "admin incidents" on public.incidents;
create policy "admin incidents" on public.incidents
  for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- =============================================================================
-- Sync auth.users.email into profiles.email (for purge-time mail / reactivation)
-- =============================================================================
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email_from_auth();

-- Backfill existing rows
update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id and p.email is null;
