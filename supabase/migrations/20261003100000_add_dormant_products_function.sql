-- Products with no sale AND no purchase in the last p_days (default 90),
-- regardless of date range or stock level -- the worklist for manually
-- marking a product's status inactive. Unlike report_sales_dashboard this
-- isn't scoped to a [from, to] window: "no activity in N days" is always
-- relative to today, so it's its own standalone function.
--
-- Consumed two ways (split by stock in ProductService.dormant):
--   stock > 0  -> Sales Report's "No Recent Activity" panel
--   stock = 0  -> Dashboard's dormant-stock panel

create or replace function public.get_dormant_products(p_days integer default 90)
returns jsonb
language sql
stable
as $$
with last_sale as (
  select distinct on (sii.item_id)
         sii.item_id,
         coalesce(si.invoice_date, si.created_at::date) as last_sold
  from public.sales_invoice_items sii
  join public.sales_invoices si on si.id = sii.sales_invoice_id
  order by sii.item_id, coalesce(si.invoice_date, si.created_at::date) desc, si.id desc
),
last_purchase as (
  -- PENDING supplier invoices are draft POs that haven't touched stock yet
  -- (same convention as report_purchase_dashboard's default).
  select distinct on (spii.product_id)
         spii.product_id,
         spi.purchase_date as last_purchased
  from public.supplier_invoice_items spii
  join public.supplier_invoices spi on spi.id = spii.invoice_id
  where spi.status = 'POSTED'
  order by spii.product_id, spi.purchase_date desc, spi.id desc
),
dormant as (
  select p.id as product_id, p.item_code, p.item_name as description,
         p.status, p.stock,
         ls.last_sold, lp.last_purchased,
         greatest(ls.last_sold, lp.last_purchased) as last_activity
  from public.products p
  left join last_sale ls on ls.item_id = p.id
  left join last_purchase lp on lp.product_id = p.id
  where greatest(ls.last_sold, lp.last_purchased) is null
     or greatest(ls.last_sold, lp.last_purchased) < current_date - p_days
)
select coalesce(jsonb_agg(jsonb_build_object(
  'product_id', product_id, 'item_code', item_code, 'description', description,
  'status', status, 'stock', stock,
  'last_sold', last_sold, 'last_purchased', last_purchased,
  'days_ago', case when last_activity is null then null
                    else (current_date - last_activity) end
) order by last_activity asc nulls first), '[]'::jsonb)
from dormant;
$$;

alter function public.get_dormant_products(integer) owner to postgres;
grant execute on function public.get_dormant_products(integer) to service_role;
