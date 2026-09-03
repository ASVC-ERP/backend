-- Cost tracking, part 6 of the R0 series.
--
-- One-time backfill of product_cost_history from POSTED supplier-invoice history,
-- reconstructing every cost change (unit_cost * conversion_factor, deduped per
-- invoice, emitted only when the value actually changed). Adds:
--   * a 'recon' step where a product's current cost differs from its last
--     reconstructable purchase cost (manual edit we can't date)
--   * a 'baseline' row for a product that has a cost but no posted purchases
-- All rows get source = 'backfill'. Idempotent: clears prior 'backfill' rows first.

delete from public.product_cost_history where source = 'backfill';

with posted_events as (
  select
    sit.product_id,
    si.id  as invoice_id,
    sit.id as item_id,
    round(sit.unit_cost * coalesce(si.conversion_factor, 1), 4) as computed_cost,
    (coalesce(si.created_at, si.purchase_date::timestamp) at time zone 'UTC') as event_at
  from public.supplier_invoice_items sit
  join public.supplier_invoices si on si.id = sit.invoice_id
  where lower(coalesce(si.status, '')) = 'posted'
),
dedup as (
  select distinct on (product_id, invoice_id)
    product_id, invoice_id, computed_cost, event_at
  from posted_events
  order by product_id, invoice_id, item_id desc
),
seq as (
  select
    product_id, invoice_id, computed_cost, event_at,
    lag(computed_cost) over (partition by product_id order by event_at, invoice_id) as prev_cost
  from dedup
),
purchase_rows as (
  select product_id, prev_cost as old_cost, computed_cost as new_cost,
         invoice_id as ref_id, event_at
  from seq
  where computed_cost is distinct from prev_cost
),
last_hist as (
  select distinct on (product_id) product_id, new_cost as last_cost
  from purchase_rows
  order by product_id, event_at desc, ref_id desc
),
recon_rows as (
  select p.id as product_id, lh.last_cost as old_cost, p.cost as new_cost,
         null::bigint as ref_id, now() as event_at
  from public.products p
  join last_hist lh on lh.product_id = p.id
  where p.cost is distinct from lh.last_cost
),
baseline_rows as (
  select p.id as product_id, null::numeric as old_cost, p.cost as new_cost,
         null::bigint as ref_id, (p.created_at at time zone 'UTC') as event_at
  from public.products p
  where p.cost is not null
    and not exists (select 1 from purchase_rows pr where pr.product_id = p.id)
)
insert into public.product_cost_history (product_id, old_cost, new_cost, source, ref_id, changed_at)
select product_id, old_cost, new_cost, 'backfill', ref_id, event_at
from (
  select * from purchase_rows
  union all select * from recon_rows
  union all select * from baseline_rows
) all_rows
order by product_id, event_at;
