-- Cache for the Sales/Purchase report "AI Insights" panel. Gemini is only
-- called when an admin clicks Generate; the result is saved here so a page
-- refresh (or another admin opening the same range) shows the last analysis
-- and when it ran, instead of an empty panel. One row per
-- (report_type, range_from, range_to); regenerating overwrites it.
--
-- data_sent is the exact sanitized payload that went to Gemini (names/IDs
-- already stripped by ReportsService) -- kept alongside the result as a
-- record of what left the server.

create table if not exists "public"."report_ai_insights" (
  "id"            bigint generated always as identity primary key,
  "report_type"   text not null check ("report_type" in ('sales', 'purchases')),
  "range_from"    date not null,
  "range_to"      date not null,
  "insights"      text not null,
  "data_sent"     jsonb not null,
  "generated_by"  bigint references "public"."users"("id") on delete set null,
  "generated_at"  timestamptz not null default now(),
  unique ("report_type", "range_from", "range_to")
);

create index if not exists "report_ai_insights_lookup_idx"
  on "public"."report_ai_insights" ("report_type", "range_from", "range_to");

alter table "public"."report_ai_insights" enable row level security;

-- Service role bypasses RLS; no policies for anon/authenticated => no client access.
grant select, insert, update on "public"."report_ai_insights" to "service_role";

comment on table "public"."report_ai_insights" is
  'Cached Gemini analysis per (report_type, range_from, range_to) for the Reports AI Insights panel. Written by ReportsService via the service role only.';
