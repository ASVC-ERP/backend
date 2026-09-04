-- Reports v2: net-of-returns.
--
-- The dashboards counted a returned item as a full sale / purchase. Now
-- they subtract returns using the per-line counters the return flow keeps
-- up to date: sales_invoice_items.return_qty and supplier_invoice_items.ret_qty.
--
-- Attribution: a return reduces the period the ORIGINAL invoice falls in
-- (that's what the counter columns support). Slow-moving is unchanged.
--
-- Same signatures as 20260904140000 -- drop + recreate for the body change.

drop function if exists public.report_sales_dashboard(date, date, integer, integer, integer);

create function public.report_sales_dashboard(
  p_from date,
  p_to date,
  p_slow_days integer default 90,
  p_limit integer default 10,
  p_slow_limit integer default 20
) returns jsonb
language sql
stable
as $$
with inv as (
  select si.id, si.cid, si.total_price
  from public.sales_invoices si
  where coalesce(si.invoice_date, si.created_at::date) between p_from and p_to
),
line as (
  select sii.item_id,
         sii.quantity,
         coalesce(sii.return_qty, 0)                     as ret_qty,
         sii.quantity - coalesce(sii.return_qty, 0)      as net_qty,
         sii.price,
         coalesce(sii.unit_cost, p.cost, 0)             as unit_cost,
         p.item_name, p.brand,
         inv.cid,
         coalesce(nullif(trim(c.city), ''), 'Unknown') as city
  from public.sales_invoice_items sii
  join inv on inv.id = sii.sales_invoice_id
  left join public.products p on p.id = sii.item_id
  left join public.customers c on c.id = inv.cid
),
ret_cid as (
  select cid, sum(ret_qty * price) as ret from line group by cid
),
ret_city as (
  select city, sum(ret_qty * price) as ret from line group by city
),
kpi as (
  select
    coalesce((select sum(total_price) from inv), 0)
      - coalesce((select sum(ret_qty * price) from line), 0)   as revenue,
    coalesce((select sum(net_qty * unit_cost) from line), 0)   as cogs
),
best as (
  select item_id as product_id, max(item_name) as description,
         sum(net_qty * price) as total
  from line group by item_id order by total desc limit p_limit
),
cust as (
  select i.cid as customer_id, max(c.name) as name,
         sum(i.total_price) - coalesce(max(rc.ret), 0) as total
  from inv i
  left join public.customers c on c.id = i.cid
  left join ret_cid rc on rc.cid = i.cid
  group by i.cid order by total desc limit p_limit
),
city as (
  select coalesce(nullif(trim(c.city), ''), 'Unknown') as city,
         sum(i.total_price) - coalesce(max(rc.ret), 0) as total
  from inv i
  left join public.customers c on c.id = i.cid
  left join ret_city rc
    on rc.city = coalesce(nullif(trim(c.city), ''), 'Unknown')
  group by 1
),
brand as (
  select coalesce(nullif(trim(brand), ''), 'Unbranded') as brand,
         sum(net_qty * price) as revenue,
         sum(net_qty * price) - sum(net_qty * unit_cost) as profit
  from line group by 1
),
last_sale as (
  select sii.item_id,
         max(coalesce(si.invoice_date, si.created_at::date)) as last_sold
  from public.sales_invoice_items sii
  join public.sales_invoices si on si.id = sii.sales_invoice_id
  group by sii.item_id
),
slow as (
  select p.id as product_id, p.item_name as description,
         ls.last_sold,
         case when ls.last_sold is null then null
              else (current_date - ls.last_sold) end as days_ago
  from public.products p
  left join last_sale ls on ls.item_id = p.id
  where coalesce(p.stock, 0) > 0
    and (ls.last_sold is null or ls.last_sold < current_date - p_slow_days)
  order by ls.last_sold asc nulls first
  limit p_slow_limit
)
select jsonb_build_object(
  'kpis', (
    select jsonb_build_object(
      'revenue',      round(revenue, 2),
      'cogs',         round(cogs, 2),
      'gross_profit', round(revenue - cogs, 2),
      'margin_pct',   case when revenue = 0 then 0
                           else round((revenue - cogs) / revenue * 100, 1) end
    ) from kpi
  ),
  'best_selling', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'description', description, 'total', round(total, 2)
    ) order by total desc) from best
  ), '[]'::jsonb),
  'top_customers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'customer_id', customer_id, 'name', name, 'total', round(total, 2)
    ) order by total desc) from cust
  ), '[]'::jsonb),
  'sales_by_city', coalesce((
    select jsonb_agg(jsonb_build_object(
      'city', city, 'total', round(total, 2)
    ) order by total desc) from city
  ), '[]'::jsonb),
  'pnl_by_brand', coalesce((
    select jsonb_agg(jsonb_build_object(
      'brand', brand, 'revenue', round(revenue, 2), 'profit', round(profit, 2),
      'margin_pct', case when revenue = 0 then 0 else round(profit / revenue * 100, 1) end
    ) order by revenue desc) from brand
  ), '[]'::jsonb),
  'slow_moving', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'description', description,
      'last_sold', last_sold, 'days_ago', days_ago
    ) order by last_sold asc nulls first) from slow
  ), '[]'::jsonb)
);
$$;

alter function public.report_sales_dashboard(date, date, integer, integer, integer) owner to postgres;
grant execute on function public.report_sales_dashboard(date, date, integer, integer, integer) to service_role;

-- ========================================================= PURCHASES =========
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
  select sit.product_id, i.supplier_id,
         (sit.subtotal - coalesce(sit.ret_qty, 0) * sit.unit_cost) * i.cf as amount,
         p.item_name
  from public.supplier_invoice_items sit
  join inv i on i.id = sit.invoice_id
  left join public.products p on p.id = sit.product_id
),
prod as (
  select product_id, max(item_name) as description, sum(amount) as total
  from line group by product_id order by total desc limit p_limit
),
sup as (
  select l.supplier_id, max(s.name) as name, sum(l.amount) as total
  from line l left join public.suppliers s on s.id = l.supplier_id
  group by l.supplier_id order by total desc limit p_limit
)
select jsonb_build_object(
  'kpis', jsonb_build_object(
    'total_purchases', coalesce((select round(sum(amount), 2) from line), 0)
  ),
  'top_products', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'description', description, 'total', round(total, 2)
    ) order by total desc) from prod
  ), '[]'::jsonb),
  'top_suppliers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'supplier_id', supplier_id, 'name', name, 'total', round(total, 2)
    ) order by total desc) from sup
  ), '[]'::jsonb)
);
$$;

alter function public.report_purchase_dashboard(date, date, text, integer) owner to postgres;
grant execute on function public.report_purchase_dashboard(date, date, text, integer) to service_role;
