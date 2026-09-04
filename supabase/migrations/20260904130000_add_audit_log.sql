-- Audit log (#8). Append-only trail of security-relevant events:
-- logins (success + failure with reason), logout, password changes,
-- refresh-token reuse, and admin user create / update / delete.
--
-- Written best-effort from AuditService (a failed insert is logged and
-- swallowed, never breaks the request it records). No auto-purge -- the
-- history is the point; revisit if volume ever bites.
--
-- actor_username / target snapshots are denormalized on purpose so a row
-- still reads after the referenced user is deleted (FK is ON DELETE SET NULL).

create table if not exists "public"."audit_log" (
  "id"             bigint generated always as identity primary key,
  "at"             timestamptz not null default now(),
  "actor_id"       bigint references "public"."users"("id") on delete set null,
  "actor_username" text,
  "action"         text not null,
  "target_type"    text,
  "target_id"      text,
  "summary"        text,
  "meta"           jsonb,
  "ip"             text
);

create index if not exists "audit_log_at_idx"     on "public"."audit_log" ("at" desc);
create index if not exists "audit_log_action_idx" on "public"."audit_log" ("action");
create index if not exists "audit_log_actor_idx"  on "public"."audit_log" ("actor_id");

alter table "public"."audit_log" enable row level security;

-- Service role bypasses RLS; no policies for anon/authenticated => no client access.
grant select, insert on "public"."audit_log" to "service_role";

comment on table "public"."audit_log" is
  'Append-only security audit trail. Written by the API (service role) only; not client-readable. See AuditService.';
