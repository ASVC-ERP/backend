-- Refresh tokens for the access/refresh auth flow.
-- One row per active login (per device). The opaque token is never stored
-- directly: token_hash holds its SHA-256. Rotation revokes the old row and
-- points replaced_by_id at the new one; reuse of a revoked row = theft signal.

create table if not exists "public"."refresh_tokens" (
  "id"             bigint generated always as identity primary key,
  "user_id"        bigint not null references "public"."users"("id") on delete cascade,
  "token_hash"     text not null unique,
  "expires_at"     timestamptz not null,
  "revoked_at"     timestamptz,
  "replaced_by_id" bigint references "public"."refresh_tokens"("id") on delete set null,
  "created_at"     timestamptz not null default now()
);

create index if not exists "refresh_tokens_user_id_idx"    on "public"."refresh_tokens" ("user_id");
create index if not exists "refresh_tokens_expires_at_idx"  on "public"."refresh_tokens" ("expires_at");

alter table "public"."refresh_tokens" owner to "postgres";

-- Backend connects with the service role key (bypasses RLS). RLS is enabled
-- with no policies, so anon / authenticated roles cannot touch this table.
alter table "public"."refresh_tokens" enable row level security;

grant all on table "public"."refresh_tokens" to "service_role";
grant usage, select on sequence "public"."refresh_tokens_id_seq" to "service_role";
