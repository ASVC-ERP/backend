-- Manual Active/Inactive status on products -- no triggers, no cron; a
-- product's status only ever changes when a human changes it (via
-- PATCH /product/:id/status). Defaults every existing row to 'active'.

alter table "public"."products"
  add column if not exists "status" "text" not null default 'active'
  check ("status" in ('active', 'inactive'));

comment on column "public"."products"."status" is
  'Manually set active/inactive flag. Not auto-maintained -- see the dedicated "no transaction in 90 days" panels for what to review.';
