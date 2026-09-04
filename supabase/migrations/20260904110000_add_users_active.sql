-- Account disable switch. Existing users default to active.
-- Flipping a user to inactive blocks login and (in code) revokes their
-- refresh tokens so any live session ends within ~15 minutes.

alter table "public"."users"
  add column if not exists "active" boolean not null default true;

comment on column "public"."users"."active" is
  'When false the user cannot log in. Toggled from the admin Users screen; setting it false, changing role, or resetting the password revokes the user''s refresh tokens.';
