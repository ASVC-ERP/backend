-- Cost tracking, part 4 of the R0 series — the ledger (Layer 2).
--
-- One row every time products.cost changes. Written explicitly from the two
-- paths that change it: post_supplier_invoice (source='purchase') and
-- adjust_product_cost (source='manual'). Backfilled from purchase history
-- (source='backfill').

create table if not exists "public"."product_cost_history" (
  "id"          bigint generated always as identity primary key,
  "product_id"  bigint not null references "public"."products"("id") on delete cascade,
  "old_cost"    numeric(10,2),
  "new_cost"    numeric(10,2) not null,
  "source"      text not null check ("source" in ('purchase', 'manual', 'backfill')),
  "ref_id"      bigint,                       -- supplier_invoices.id when source = 'purchase'
  "changed_by"  bigint references "public"."users"("id"),
  "changed_at"  timestamptz not null default now()
);

create index if not exists "product_cost_history_product_idx"
  on "public"."product_cost_history" ("product_id", "changed_at" desc);

alter table "public"."product_cost_history" enable row level security;

grant all on table "public"."product_cost_history" to "service_role";
grant usage, select on sequence "public"."product_cost_history_id_seq" to "service_role";
