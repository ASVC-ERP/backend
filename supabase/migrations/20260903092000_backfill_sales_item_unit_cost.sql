-- Cost tracking, part 3 of the R0 series.
--
-- One-time backfill of sales_invoice_items.unit_cost for rows created before the
-- snapshot existed. For each sold line, take the most recent POSTED supplier
-- purchase of that product at or before the moment the sale was invoiced
-- (unit_cost * conversion_factor, matching how post_supplier_invoice derives
-- products.cost). Rows with no reconstructable cost are left NULL.
--
-- Idempotent: only touches rows where unit_cost is null.

update public.sales_invoice_items sii
set unit_cost = c.cost
from (
  select
    x.id,
    (
      select round(sit.unit_cost * coalesce(si.conversion_factor, 1), 2)
      from public.supplier_invoice_items sit
      join public.supplier_invoices si on si.id = sit.invoice_id
      where sit.product_id = x.item_id
        and lower(coalesce(si.status, '')) = 'posted'
        and coalesce(si.created_at, si.purchase_date::timestamp) <= (x.sale_at at time zone 'UTC')
      order by coalesce(si.created_at, si.purchase_date::timestamp) desc, si.id desc
      limit 1
    ) as cost
  from (
    select sii2.id, sii2.item_id, sinv.created_at as sale_at
    from public.sales_invoice_items sii2
    join public.sales_invoices sinv on sinv.id = sii2.sales_invoice_id
    where sii2.unit_cost is null
  ) x
) c
where c.id = sii.id and c.cost is not null;
