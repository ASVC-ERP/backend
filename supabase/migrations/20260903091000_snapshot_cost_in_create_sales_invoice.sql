-- Cost tracking, part 2 of the R0 series.
--
-- Only change vs the baseline create_sales_invoice: step 6 now also copies the
-- current products.cost into sales_invoice_items.unit_cost, so every new invoice
-- records the cost of goods at the moment of sale.

CREATE OR REPLACE FUNCTION "public"."create_sales_invoice"("p_order_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$declare
  v_order sales_orders;
  v_invoice_id bigint;
  v_total numeric;
begin
  -- 1. lock order
  select *
  into v_order
  from sales_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  -- 2. validate order status
  if v_order.status not in ('Served', 'Partial Served') then
    raise exception
      'Order % cannot be invoiced (status: %)',
      p_order_id, v_order.status;
  end if;

  -- 3. prevent double invoice
  if exists (
    select 1
    from sales_invoices
    where order_id = p_order_id
  ) then
    raise exception 'Invoice already exists for order %', p_order_id;
  end if;

  -- 4. compute total from served quantities
  select sum(serve_qty * price)
  into v_total
  from sales_order_items
  where sales_order_id = p_order_id
    and serve_qty > 0;

  if v_total is null or v_total = 0 then
    raise exception 'No served items to invoice for order %', p_order_id;
  end if;

  -- 5. create invoice header
  insert into sales_invoices (
    order_id,
    cid,
    sales_agent,
    invoice_date,
    total_price
  )
  values (
    p_order_id,
    v_order.cid,
    v_order.sales_agent,
    current_date,
    v_total
  )
  returning id into v_invoice_id;

  -- 6. copy served items into invoice items, snapshotting product cost
  insert into sales_invoice_items (
    sales_invoice_id,
    item_id,
    quantity,
    price,
    unit_cost
  )
  select
    v_invoice_id,
    soi.item_id,
    soi.serve_qty,
    soi.price,
    p.cost
  from sales_order_items soi
  left join products p on p.id = soi.item_id
  where soi.sales_order_id = p_order_id
    and soi.serve_qty > 0;

  -- 7. mark order as invoiced
  update sales_orders
  set status = case
    when v_order.status = 'Served' then 'Invoiced'
    when v_order.status = 'Partial Served' then 'Partial Invoiced'
    else status
  end
  where id = p_order_id;

  -- 8. return result
  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'total_price', v_total
  );
end;$$;
