-- Cost tracking, part 1 of the R0 series.
--
-- Snapshot the unit cost onto each sold line at invoice time, the same way
-- `price` is already snapshotted. Populated going forward by create_sales_invoice
-- (next migration) and backfilled for existing rows (migration after that).
-- COGS then = SUM(quantity * unit_cost) and is immune to later cost changes.

alter table "public"."sales_invoice_items"
  add column if not exists "unit_cost" numeric(10,2);

comment on column "public"."sales_invoice_items"."unit_cost" is
  'Product cost at the moment the invoice was created (moving-average / point-of-sale). NULL for pre-backfill rows with no reconstructable cost.';
