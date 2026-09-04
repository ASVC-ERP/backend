-- Per-account login lockout (#7).
--
-- failed_login_attempts counts consecutive failed logins since the last
-- success. When it reaches the threshold (enforced in code, currently 5),
-- the app sets locked_until = now() + a cooldown (currently 15 min) and
-- resets the counter. While locked_until is in the future, login is
-- refused regardless of password. A correct login clears both fields.
--
-- Adding both columns with a constant default is metadata-only on
-- Postgres, so this is safe on a populated table. Existing rows read as
-- 0 / null, i.e. "never failed, not locked".

alter table "public"."users"
  add column if not exists "failed_login_attempts" integer not null default 0,
  add column if not exists "locked_until" timestamptz;

comment on column "public"."users"."failed_login_attempts" is
  'Consecutive failed logins since the last success. Reset to 0 on a successful login or when a lock is applied.';

comment on column "public"."users"."locked_until" is
  'When set and in the future, login is refused regardless of password. Set after too many consecutive failed attempts; cleared on a successful login or by an admin (unlock).';
