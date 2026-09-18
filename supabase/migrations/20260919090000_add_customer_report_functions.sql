-- Reports R3 — per-customer statistics.
--
-- Two functions, same shape/conventions as report_sales_dashboard /
-- report_purchase_dashboard (20260904150000_reports_net_of_returns.sql):
--   * sale date = coalesce(invoice_date, created_at::date)
--   * revenue / margin net of returns via sales_invoice_items.return_qty
--   * COGS = quantity * coalesce(sales_invoice_items.unit_cost, products.cost, 0)
--
--   report_customer_dashboard  -- ranked list across all customers, for a range
--   report_customer_detail     -- one customer's full profile + history

-- ==================================================== CUSTOMER DASHBOARD =====
create or replace function public.report_customer_dashboard(
  p_from date,
  p_to date,
  p_limit integer default 10
) returns jsonb
language sql
stable
as $$
with inv as (
  select si.id, si.cid, si.total_price,
         coalesce(si.invoice_date, si.created_at::date) as sale_date
  from public.sales_invoices si
  where coalesce(si.invoice_date, si.created_at::date) between p_from and p_to
),
line as (
  select sii.sales_invoice_id, sii.item_id, sii.quantity,
         coalesce(sii.return_qty, 0)                    as ret_qty,
         sii.quantity - coalesce(sii.return_qty, 0)      as net_qty,
         sii.price,
         coalesce(sii.unit_cost, p.cost, 0)             as unit_cost,
         inv.cid
  from public.sales_invoice_items sii
  join inv on inv.id = sii.sales_invoice_id
  left join public.products p on p.id = sii.item_id
),
ret_cid as (
  select cid, sum(ret_qty * price) as ret from line group by cid
),
margin_cid as (
  select cid,
         sum(net_qty * price)                        as net_revenue,
         sum(net_qty * price) - sum(net_qty * unit_cost) as profit
  from line group by cid
),
-- First-ever sale per customer (unbounded by the range) decides new vs returning.
first_ever as (
  select cid, min(coalesce(invoice_date, created_at::date)) as first_date
  from public.sales_invoices
  group by cid
),
cust as (
  select
    i.cid                                              as customer_id,
    max(c.name)                                         as name,
    coalesce(nullif(trim(max(c.city)), ''), 'Unknown')  as city,
    count(distinct i.id)                                as total_orders,
    sum(i.total_price) - coalesce(max(rc.ret), 0)       as revenue,
    max(i.sale_date)                                    as last_order_date,
    case when max(fe.first_date) between p_from and p_to then true else false end as is_new,
    case when coalesce(max(mc.net_revenue), 0) = 0 then 0
         else round(max(mc.profit) / max(mc.net_revenue) * 100, 1) end as margin_pct
  from inv i
  left join public.customers c on c.id = i.cid
  left join ret_cid rc on rc.cid = i.cid
  left join margin_cid mc on mc.cid = i.cid
  left join first_ever fe on fe.cid = i.cid
  group by i.cid
),
kpi as (
  select
    count(*)                                  as active_customers,
    coalesce(sum(revenue), 0)                 as revenue,
    coalesce(sum(total_orders), 0)             as total_orders,
    count(*) filter (where is_new)             as new_customers,
    count(*) filter (where not is_new)         as returning_customers
  from cust
),
top as (
  select * from cust order by revenue desc limit p_limit
),
city_agg as (
  select city, sum(revenue) as total from cust group by city
)
select jsonb_build_object(
  'kpis', (
    select jsonb_build_object(
      'active_customers',    active_customers,
      'revenue',             round(revenue, 2),
      'avg_order_value',     case when total_orders = 0 then 0
                                   else round(revenue / total_orders, 2) end,
      'new_customers',       new_customers,
      'returning_customers', returning_customers
    ) from kpi
  ),
  'top_customers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'customer_id',      customer_id,
      'name',             name,
      'city',             city,
      'total_orders',     total_orders,
      'total',            round(revenue, 2),
      'avg_order_value',  case when total_orders = 0 then 0
                                else round(revenue / total_orders, 2) end,
      'margin_pct',       margin_pct,
      'last_order_date',  last_order_date,
      'is_new',           is_new
    ) order by revenue desc) from top
  ), '[]'::jsonb),
  'customers_by_city', coalesce((
    select jsonb_agg(jsonb_build_object(
      'city', city, 'total', round(total, 2)
    ) order by total desc) from city_agg
  ), '[]'::jsonb)
);
$$;

alter function public.report_customer_dashboard(date, date, integer) owner to postgres;
grant execute on function public.report_customer_dashboard(date, date, integer) to service_role;

-- ====================================================== CUSTOMER DETAIL ======
create or replace function public.report_customer_detail(
  p_customer_id bigint,
  p_from date,
  p_to date,
  p_limit integer default 50
) returns jsonb
language sql
stable
as $$
with profile as (
  select id, name, city, tin, terms, pic, address, created_at
  from public.customers
  where id = p_customer_id
),
all_inv as (
  select si.id, si.invoice_number, si.total_price,
         coalesce(si.invoice_date, si.created_at::date) as sale_date
  from public.sales_invoices si
  where si.cid = p_customer_id
),
all_line as (
  select sii.sales_invoice_id, sii.item_id, sii.quantity,
         coalesce(sii.return_qty, 0)                    as ret_qty,
         sii.quantity - coalesce(sii.return_qty, 0)      as net_qty,
         sii.price,
         coalesce(sii.unit_cost, p.cost, 0)             as unit_cost,
         p.item_name, p.brand
  from public.sales_invoice_items sii
  join all_inv on all_inv.id = sii.sales_invoice_id
  left join public.products p on p.id = sii.item_id
),
lifetime as (
  select
    (select count(*) from all_inv)                                        as total_orders,
    coalesce((select sum(total_price) from all_inv), 0)
      - coalesce((select sum(ret_qty * price) from all_line), 0)          as revenue,
    coalesce((select sum(net_qty * price) from all_line), 0)              as net_revenue,
    coalesce((select sum(net_qty * price) - sum(net_qty * unit_cost) from all_line), 0) as profit
),
monthly as (
  select date_trunc('month', sale_date)::date as month, sum(total_price) as total
  from all_inv
  where sale_date >= (p_to - interval '11 months')::date and sale_date <= p_to
  group by 1
),
top_products as (
  select item_id, max(item_name) as description, max(brand) as brand,
         sum(net_qty) as quantity, sum(net_qty * price) as total
  from all_line
  group by item_id
  order by total desc
  limit 5
),
orders as (
  select ai.id, ai.invoice_number, ai.sale_date, ai.total_price,
         (select count(*) from public.sales_invoice_items where sales_invoice_id = ai.id) as item_count
  from all_inv ai
  where ai.sale_date between p_from and p_to
  order by ai.sale_date desc
  limit p_limit
)
select jsonb_build_object(
  'profile', (
    select jsonb_build_object(
      'customer_id', id, 'name', name, 'city', city, 'tin', tin,
      'terms', terms, 'pic', pic, 'address', address, 'customer_since', created_at
    ) from profile
  ),
  'kpis', (
    select jsonb_build_object(
      'lifetime_revenue', round(revenue, 2),
      'total_orders',     total_orders,
      'avg_order_value',  case when total_orders = 0 then 0
                                else round(revenue / total_orders, 2) end,
      'margin_pct',       case when net_revenue = 0 then 0
                                else round(profit / net_revenue * 100, 1) end
    ) from lifetime
  ),
  'monthly_revenue', coalesce((
    select jsonb_agg(jsonb_build_object(
      'month', month, 'total', round(total, 2)
    ) order by month) from monthly
  ), '[]'::jsonb),
  'top_products', coalesce((
    select jsonb_agg(jsonb_build_object(
      'item_id', item_id, 'description', description, 'brand', brand,
      'quantity', quantity, 'total', round(total, 2)
    ) order by total desc) from top_products
  ), '[]'::jsonb),
  'orders', coalesce((
    select jsonb_agg(jsonb_build_object(
      'invoice_id', id, 'invoice_number', invoice_number, 'date', sale_date,
      'items', item_count, 'total', round(total_price, 2)
    ) order by sale_date desc) from orders
  ), '[]'::jsonb)
);
$$;

alter function public.report_customer_detail(bigint, date, date, integer) owner to postgres;
grant execute on function public.report_customer_detail(bigint, date, date, integer) to service_role;
