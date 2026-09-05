-- Figma "view full" rankings pages on the Purchase side need more columns:
--   - Supplier Rankings: Total Orders alongside Supplier and Total Purchases.
--   - Top Purchased Products: Code, Brand, Quantity alongside Description
--     and Purchased Value.
-- Everything else is unchanged from 20260904150000_reports_net_of_returns.sql.
--
-- Same signature -- drop + recreate for the body change.

drop function if exists public.report_purchase_dashboard(date, date, text, integer);

create function public.report_purchase_dashboard(
  p_from date,
  p_to date,
  p_status text default null,
  p_limit integer default 10
) returns jsonb
language sql
stable
as $$
with inv as (
  select si.id, si.supplier_id, coalesce(si.conversion_factor, 1) as cf
  from public.supplier_invoices si
  where coalesce(si.purchase_date, si.created_at::date) between p_from and p_to
    and (p_status is null or lower(coalesce(si.status, '')) = lower(p_status))
),
line as (
  select sit.product_id, i.supplier_id, i.id as invoice_id,
         (sit.subtotal - coalesce(sit.ret_qty, 0) * sit.unit_cost) * i.cf as amount,
         (sit.quantity - coalesce(sit.ret_qty, 0)) as net_qty,
         p.item_name, p.item_code, p.brand
  from public.supplier_invoice_items sit
  join inv i on i.id = sit.invoice_id
  left join public.products p on p.id = sit.product_id
),
prod as (
  select product_id, max(item_name) as description,
         max(item_code) as item_code,
         max(coalesce(nullif(trim(brand), ''), 'Unbranded')) as brand,
         sum(net_qty) as quantity,
         sum(amount) as total
  from line group by product_id order by total desc limit p_limit
),
sup as (
  select l.supplier_id, max(s.name) as name,
         count(distinct l.invoice_id) as total_orders,
         sum(l.amount) as total
  from line l left join public.suppliers s on s.id = l.supplier_id
  group by l.supplier_id order by total desc limit p_limit
)
select jsonb_build_object(
  'kpis', jsonb_build_object(
    'total_purchases', coalesce((select round(sum(amount), 2) from line), 0)
  ),
  'top_products', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'item_code', item_code, 'description', description,
      'brand', brand, 'quantity', quantity, 'total', round(total, 2)
    ) order by total desc) from prod
  ), '[]'::jsonb),
  'top_suppliers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'supplier_id', supplier_id, 'name', name,
      'total_orders', total_orders, 'total', round(total, 2)
    ) order by total desc) from sup
  ), '[]'::jsonb)
);
$$;

alter function public.report_purchase_dashboard(date, date, text, integer) owner to postgres;
grant execute on function public.report_purchase_dashboard(date, date, text, integer) to service_role;
