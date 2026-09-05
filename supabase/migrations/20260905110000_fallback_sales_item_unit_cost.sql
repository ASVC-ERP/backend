-- Cost tracking, part 4 of the R0 series.
--
-- Fallback for sales_invoice_items.unit_cost rows the historical backfill
-- (20260903092000) could not reconstruct — sales with no posted supplier
-- invoice existing before the sale. Uses the product's current cost as a
-- best-effort estimate, matching how create_sales_invoice() snapshots cost
-- for new sales.
--
-- Idempotent: only touches rows where unit_cost is still null.

update public.sales_invoice_items sii
set unit_cost = p.cost
from public.products p
where p.id = sii.item_id
  and sii.unit_cost is null
  and p.cost is not null;
