-- Reports R4 — per-supplier statistics (mirrors the customer report R3
-- functions, on the purchase side).
--
-- Same conventions as report_purchase_dashboard:
--   * purchase date = coalesce(purchase_date, created_at::date)
--   * spend, net of returns via supplier_invoice_items.ret_qty
--   * amounts are converted to base currency via conversion_factor
--   * p_status: null = all invoices; e.g. 'POSTED' to filter (service layer
--     defaults this to 'POSTED' the same way report_purchase_dashboard does)
--
-- supplier_invoices has no stored total -- unlike sales_invoices.total_price,
-- an invoice's amount is always the sum of its line items.
--
--   report_supplier_dashboard  -- ranked list across all suppliers, for a range
--   report_supplier_detail     -- one supplier's full profile + history

-- ==================================================== SUPPLIER DASHBOARD =====
create or replace function public.report_supplier_dashboard(
  p_from date,
  p_to date,
  p_status text default null,
  p_limit integer default 10
) returns jsonb
language sql
stable
as $$
with inv as (
  select si.id, si.supplier_id, coalesce(si.conversion_factor, 1) as cf,
         coalesce(si.purchase_date, si.created_at::date) as purchase_date
  from public.supplier_invoices si
  where coalesce(si.purchase_date, si.created_at::date) between p_from and p_to
    and (p_status is null or lower(coalesce(si.status, '')) = lower(p_status))
),
line as (
  select sit.product_id, i.supplier_id, i.id as invoice_id, i.purchase_date,
         (sit.subtotal - coalesce(sit.ret_qty, 0) * sit.unit_cost) * i.cf as amount
  from public.supplier_invoice_items sit
  join inv i on i.id = sit.invoice_id
),
-- First-ever purchase per supplier (unbounded by the range, same status
-- filter) decides new vs returning.
first_ever as (
  select supplier_id, min(coalesce(purchase_date, created_at::date)) as first_date
  from public.supplier_invoices
  where (p_status is null or lower(coalesce(status, '')) = lower(p_status))
  group by supplier_id
),
sup as (
  select
    l.supplier_id,
    max(s.name)                                          as name,
    max(coalesce(nullif(trim(s.currency), ''), 'PHP'))    as currency,
    count(distinct l.invoice_id)                          as total_orders,
    sum(l.amount)                                         as total,
    max(l.purchase_date)                                  as last_order_date,
    case when max(fe.first_date) between p_from and p_to then true else false end as is_new
  from line l
  left join public.suppliers s on s.id = l.supplier_id
  left join first_ever fe on fe.supplier_id = l.supplier_id
  group by l.supplier_id
),
kpi as (
  select
    count(*)                                  as active_suppliers,
    coalesce(sum(total), 0)                   as total_spend,
    coalesce(sum(total_orders), 0)             as total_orders,
    count(*) filter (where is_new)             as new_suppliers,
    count(*) filter (where not is_new)         as returning_suppliers
  from sup
),
top as (
  select * from sup order by total desc limit p_limit
),
currency_agg as (
  select currency, sum(total) as total from sup group by currency
)
select jsonb_build_object(
  'kpis', (
    select jsonb_build_object(
      'active_suppliers',    active_suppliers,
      'total_spend',         round(total_spend, 2),
      'avg_order_value',     case when total_orders = 0 then 0
                                   else round(total_spend / total_orders, 2) end,
      'new_suppliers',       new_suppliers,
      'returning_suppliers', returning_suppliers
    ) from kpi
  ),
  'top_suppliers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'supplier_id',       supplier_id,
      'name',              name,
      'currency',          currency,
      'total_orders',      total_orders,
      'total',             round(total, 2),
      'avg_order_value',   case when total_orders = 0 then 0
                                 else round(total / total_orders, 2) end,
      'last_order_date',   last_order_date,
      'is_new',            is_new
    ) order by total desc) from top
  ), '[]'::jsonb),
  'suppliers_by_currency', coalesce((
    select jsonb_agg(jsonb_build_object(
      'currency', currency, 'total', round(total, 2)
    ) order by total desc) from currency_agg
  ), '[]'::jsonb)
);
$$;

alter function public.report_supplier_dashboard(date, date, text, integer) owner to postgres;
grant execute on function public.report_supplier_dashboard(date, date, text, integer) to service_role;

-- ====================================================== SUPPLIER DETAIL ======
create or replace function public.report_supplier_detail(
  p_supplier_id bigint,
  p_from date,
  p_to date,
  p_status text default null,
  p_limit integer default 50
) returns jsonb
language sql
stable
as $$
with profile as (
  select id, name, address, currency, number, created_at
  from public.suppliers
  where id = p_supplier_id
),
all_line as (
  select sit.id, sit.invoice_id, sit.product_id,
         sit.quantity,
         coalesce(sit.ret_qty, 0)                    as ret_qty,
         sit.quantity - coalesce(sit.ret_qty, 0)      as net_qty,
         (sit.subtotal - coalesce(sit.ret_qty, 0) * sit.unit_cost)
           * coalesce(si.conversion_factor, 1)        as amount,
         coalesce(si.purchase_date, si.created_at::date) as purchase_date,
         si.invoice_number,
         p.item_name, p.brand
  from public.supplier_invoice_items sit
  join public.supplier_invoices si on si.id = sit.invoice_id
  left join public.products p on p.id = sit.product_id
  where si.supplier_id = p_supplier_id
    and (p_status is null or lower(coalesce(si.status, '')) = lower(p_status))
),
lifetime as (
  select
    count(distinct invoice_id)          as total_orders,
    coalesce(sum(amount), 0)            as spend,
    coalesce(sum(net_qty), 0)           as total_items
  from all_line
),
monthly as (
  select date_trunc('month', purchase_date)::date as month, sum(amount) as total
  from all_line
  where purchase_date >= (p_to - interval '11 months')::date and purchase_date <= p_to
  group by 1
),
top_products as (
  select product_id, max(item_name) as description, max(brand) as brand,
         sum(net_qty) as quantity, sum(amount) as total
  from all_line
  group by product_id
  order by total desc
  limit 5
),
orders as (
  select invoice_id,
         max(invoice_number) as invoice_number,
         max(purchase_date)  as purchase_date,
         sum(amount)         as total,
         count(*)            as item_count
  from all_line
  where purchase_date between p_from and p_to
  group by invoice_id
  order by max(purchase_date) desc
  limit p_limit
)
select jsonb_build_object(
  'profile', (
    select jsonb_build_object(
      'supplier_id', id, 'name', name, 'address', address,
      'currency', currency, 'number', number, 'supplier_since', created_at
    ) from profile
  ),
  'kpis', (
    select jsonb_build_object(
      'lifetime_spend',   round(spend, 2),
      'total_orders',     total_orders,
      'avg_order_value',  case when total_orders = 0 then 0
                                else round(spend / total_orders, 2) end,
      'total_items',      total_items
    ) from lifetime
  ),
  'monthly_spend', coalesce((
    select jsonb_agg(jsonb_build_object(
      'month', month, 'total', round(total, 2)
    ) order by month) from monthly
  ), '[]'::jsonb),
  'top_products', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'description', description, 'brand', brand,
      'quantity', quantity, 'total', round(total, 2)
    ) order by total desc) from top_products
  ), '[]'::jsonb),
  'orders', coalesce((
    select jsonb_agg(jsonb_build_object(
      'invoice_id', invoice_id, 'invoice_number', invoice_number,
      'date', purchase_date, 'items', item_count, 'total', round(total, 2)
    ) order by purchase_date desc) from orders
  ), '[]'::jsonb)
);
$$;

alter function public.report_supplier_detail(bigint, date, date, text, integer) owner to postgres;
grant execute on function public.report_supplier_detail(bigint, date, date, text, integer) to service_role;
