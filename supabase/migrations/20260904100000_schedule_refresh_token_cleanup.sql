-- refresh_tokens grows one row per login per device and nothing removes them.
-- Schedule a daily purge of rows past their expiry (already-dead tokens —
-- rotate() rejects them anyway). Revoked-but-not-yet-expired rows are left so
-- reuse detection can still fire within the token's original window.
--
-- Needs pg_cron (available on all Supabase projects). Re-running cron.schedule
-- with the same job name updates it, so this file is idempotent.

create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-refresh-tokens',
  '17 3 * * *',   -- daily, 03:17 UTC
  $$delete from public.refresh_tokens where expires_at < now()$$
);
