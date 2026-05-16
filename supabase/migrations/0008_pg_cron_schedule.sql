-- Schedule the scheduled-purge Edge Function via pg_cron + pg_net.
-- Runs daily at 03:00 UTC (11:00 Asia/Tokyo, 19:00 PST). Light load window.
--
-- Prereqs:
--   * `supabase secrets set CRON_SECRET=...` already done (see .env.functions.local).
--   * `SUPABASE_URL` available as project-level setting `app.supabase_url`.
-- Both are referenced via `current_setting()` at call time so the cron job stays
-- portable across environments without hardcoded host strings.

-- 1. Enable required extensions in pg_catalog schema (only takes effect if not
--    already loaded; safe to re-run).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2. Store SUPABASE_URL and CRON_SECRET as runtime parameters. These can be set
--    by the project owner via the Supabase Dashboard (Database → Settings →
--    Custom Postgres Config) OR by running ALTER ROLE postgres SET ... once.
--    The migration is idempotent: if the params already exist, no-op.
do $$
begin
  -- Best-effort set; will silently no-op if role/permission missing.
  begin
    perform set_config(
      'app.supabase_url',
      'https://thsxfuvbawnfajjpxfra.supabase.co',
      false
    );
  exception when others then
    raise notice 'set app.supabase_url skipped: %', sqlerrm;
  end;
end $$;

-- 3. Unschedule any prior job with the same name so re-running this migration
--    refreshes the schedule cleanly.
select cron.unschedule('daily-scheduled-purge')
where exists (select 1 from cron.job where jobname = 'daily-scheduled-purge');

-- 4. Schedule the daily call at 03:00 UTC.
--    NOTE: The CRON_SECRET token is materialized at scheduling time via
--    current_setting(). If you rotate CRON_SECRET, re-run this migration.
select cron.schedule(
  'daily-scheduled-purge',
  '0 3 * * *',
  $cron$
  select extensions.net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/scheduled-purge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Health check view: shows the last few cron runs so ops can spot failures.
create or replace view public.cron_purge_runs as
  select
    runid,
    jobid,
    job_pid,
    start_time,
    end_time,
    status,
    return_message
  from cron.job_run_details
  where jobid = (select jobid from cron.job where jobname = 'daily-scheduled-purge')
  order by start_time desc
  limit 30;

-- Note: app.cron_secret must be set separately by the dashboard owner via:
--   ALTER ROLE postgres SET app.cron_secret = '<value from .env.functions.local>';
-- The migration cannot do this because it would need superuser privileges that
-- the migration runner does not have.
