-- =============================================================================
-- 0003_support_tickets.sql
-- Customer support tickets + SLA monitoring view.
-- See docs/TECH_SPEC.md §15 + .trellis/spec/guides/customer-support.md.
-- =============================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,   -- audit trail kept after user purge
  -- Channel + classification
  channel text not null check (channel in ('email','in_app','chat')),
  category text not null check (category in (
    'reading_inaccurate',     -- AI hallucination / misreading
    'unhappy_result',         -- subjective dislike of fortune-telling outcome
    'pdf_failed',
    'payment_issue',
    'refund_request',
    'legal_regulatory',       -- ALWAYS priority 1
    'abuse_threat',           -- ALWAYS priority 1
    'other'
  )),
  priority smallint not null default 3 check (priority between 1 and 5),
  -- State machine
  status text not null default 'open' check (
    status in ('open','in_progress','replied','closed','escalated')
  ),
  -- Content
  subject text not null,
  initial_body text not null,
  -- replies: [{ from: 'user'|'support', at: ISO ts, body, attachments?: [] }]
  replies jsonb not null default '[]'::jsonb,
  internal_notes text,
  -- Related business objects (for traceability when reviewing complaints)
  related_reading_id uuid references public.readings on delete set null,
  related_report_id uuid references public.reports on delete set null,
  related_subscription_id text,
  -- Refund linkage
  refund_id text,
  refund_amount_usd numeric(10,2),
  -- Timestamps for SLA monitoring
  created_at timestamptz not null default now(),
  first_reply_at timestamptz,
  closed_at timestamptz,
  -- Assignee (single-dev for now; multi-agent future)
  assigned_to text
);

create index if not exists tickets_status on public.support_tickets (status)
  where status in ('open','in_progress','escalated');
create index if not exists tickets_priority on public.support_tickets (priority, created_at)
  where status != 'closed';
create index if not exists tickets_user on public.support_tickets (user_id, created_at desc);
create index if not exists tickets_category on public.support_tickets (category, created_at desc);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.support_tickets enable row level security;

-- Users can read + create their own tickets (in-app feedback flow)
drop policy if exists "read own tickets"  on public.support_tickets;
drop policy if exists "create own tickets" on public.support_tickets;
drop policy if exists "admin tickets full" on public.support_tickets;

create policy "read own tickets" on public.support_tickets
  for select using (auth.uid() = user_id);

create policy "create own tickets" on public.support_tickets
  for insert with check (
    auth.uid() = user_id
    and category in ('reading_inaccurate','unhappy_result','pdf_failed',
                     'payment_issue','refund_request','other')   -- no self-flagging legal/abuse
  );

create policy "admin tickets full" on public.support_tickets
  for all using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- =============================================================================
-- SLA monitoring view (rolling 30 days)
-- =============================================================================
create or replace view public.ticket_sla_metrics as
select
  date_trunc('day', created_at)::date as day,
  count(*) as total,
  count(*) filter (
    where first_reply_at is not null
    and first_reply_at - created_at <= interval '24 hours'
  ) * 100.0 / nullif(count(*), 0) as first_reply_24h_pct,
  count(*) filter (
    where status = 'closed'
    and closed_at - created_at <= interval '72 hours'
  ) * 100.0 / nullif(count(*) filter (where status = 'closed'), 0) as close_72h_pct,
  count(*) filter (where status = 'escalated') as escalated_count,
  count(*) filter (where category = 'legal_regulatory') as legal_count,
  count(*) filter (where category = 'abuse_threat')    as abuse_count
from public.support_tickets
where created_at >= now() - interval '30 days'
group by 1
order by 1 desc;

-- View RLS via security_invoker (Postgres 15+); fall back to checking caller is admin.
-- For Supabase: only admins can SELECT this view via a policy on the underlying table.
