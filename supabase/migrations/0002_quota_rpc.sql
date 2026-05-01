-- =============================================================================
-- 0002_quota_rpc.sql
-- Atomic quota deduction + rollback. See docs/TECH_SPEC.md §3.
--
-- Rationale: client `update usage_quotas set readings_used = readings_used + 1`
-- is racy. Use plpgsql functions with FOR UPDATE row lock.
-- =============================================================================

-- consume_reading_quota: atomically increment readings_used if under tier limit.
-- Returns table(allowed boolean, remaining int, reason text).
-- Reason is null on success, 'quota_exceeded' otherwise.
create or replace function public.consume_reading_quota(
  p_user_id uuid,
  p_tier text
) returns table (allowed boolean, remaining int, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_quota public.usage_quotas;
  v_period_start date := date_trunc('month', now())::date;
begin
  -- Lock row (or insert if missing)
  select * into v_quota from public.usage_quotas
    where user_id = p_user_id
    for update;

  if not found then
    insert into public.usage_quotas (user_id, period_start)
    values (p_user_id, v_period_start)
    returning * into v_quota;
  end if;

  -- Cross-month reset
  if v_quota.period_start < v_period_start then
    update public.usage_quotas
      set period_start = v_period_start,
          readings_used = 0,
          pdf_reports_used = 0,
          updated_at = now()
      where user_id = p_user_id
      returning * into v_quota;
  end if;

  -- Tier limit (keep aligned with .trellis/spec/supabase/llm-routing.md)
  v_limit := case p_tier
    when 'free' then 3
    when 'plus' then 30
    when 'pro'  then 200    -- soft cap; UI says "high frequency", not "unlimited"
    else 3
  end;

  if v_quota.readings_used >= v_limit then
    return query select false, 0, 'quota_exceeded'::text;
    return;
  end if;

  update public.usage_quotas
    set readings_used = readings_used + 1,
        updated_at = now()
    where user_id = p_user_id;

  return query select true, (v_limit - v_quota.readings_used - 1), null::text;
end;
$$;

-- rollback_reading_quota: decrement after fallback or stream error.
-- Idempotent (won't go below 0).
create or replace function public.rollback_reading_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usage_quotas
    set readings_used = greatest(0, readings_used - 1),
        updated_at = now()
    where user_id = p_user_id;
end;
$$;

-- consume_pdf_quota: tracks pdf_reports_used (currently only for stats; PDFs
-- are paid one-shot so they don't enforce limits, but we count for analytics).
create or replace function public.consume_pdf_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
begin
  insert into public.usage_quotas (user_id, period_start, pdf_reports_used)
  values (p_user_id, v_period_start, 1)
  on conflict (user_id) do update
    set pdf_reports_used = case
      when public.usage_quotas.period_start < v_period_start then 1
      else public.usage_quotas.pdf_reports_used + 1
    end,
    period_start = greatest(public.usage_quotas.period_start, v_period_start),
    updated_at = now();
end;
$$;

-- Restrict execution to authenticated users (anon role cannot call quota RPCs).
revoke all on function public.consume_reading_quota(uuid, text) from public, anon;
revoke all on function public.rollback_reading_quota(uuid) from public, anon;
revoke all on function public.consume_pdf_quota(uuid) from public, anon;
grant execute on function public.consume_reading_quota(uuid, text) to authenticated, service_role;
grant execute on function public.rollback_reading_quota(uuid) to authenticated, service_role;
grant execute on function public.consume_pdf_quota(uuid) to service_role;
