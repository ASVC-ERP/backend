


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."approve_serve_order"("p_order_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_order_item public.sales_order_items;
  v_product public.products;
  v_all_served boolean;
  v_status text;
BEGIN
  -- 1. Lock and read order status
  SELECT status
  INTO v_status
  FROM public.sales_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Hard guards
  IF v_status = 'Invoiced' THEN
    RAISE EXCEPTION 'Cannot approve an invoiced order';
  END IF;

  IF v_status IN ('Served', 'Partial Served') THEN
    RAISE EXCEPTION 'Order already approved and served';
  END IF;

  IF v_status <> 'For Approval' THEN
    RAISE EXCEPTION 'Order is not pending approval';
  END IF;

  -- 3. Loop through order items
  FOR v_order_item IN
    SELECT *
    FROM public.sales_order_items
    WHERE sales_order_id = p_order_id
  LOOP
    -- Skip items not requested for serve
    IF v_order_item.serve_qty = 0 THEN
      CONTINUE;
    END IF;

    -- 4. Lock product
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = v_order_item.item_id
    FOR UPDATE;

    -- 5. Validate stock
    IF v_product.stock < v_order_item.serve_qty THEN
      RAISE EXCEPTION
        'Insufficient stock for product %, required %, available %',
        v_product.id,
        v_order_item.serve_qty,
        v_product.stock;
    END IF;

    -- 6. Deduct stock
    UPDATE public.products
    SET stock = stock - v_order_item.serve_qty
    WHERE id = v_product.id;
  END LOOP;

  -- 7. Determine final order status
  SELECT bool_and(serve_qty = quantity)
  INTO v_all_served
  FROM public.sales_order_items
  WHERE sales_order_id = p_order_id;

  UPDATE public.sales_orders
  SET status = CASE
    WHEN v_all_served THEN 'Served'
    ELSE 'Partial Served'
  END
  WHERE id = p_order_id;

END;$$;


ALTER FUNCTION "public"."approve_serve_order"("p_order_id" bigint) OWNER TO "postgres";


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

  -- 6. copy served items into invoice items
  insert into sales_invoice_items (
    sales_invoice_id,
    item_id,
    quantity,
    price
  )
  select
    v_invoice_id,
    item_id,
    serve_qty,
    price
  from sales_order_items
  where sales_order_id = p_order_id
    and serve_qty > 0;

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


ALTER FUNCTION "public"."create_sales_invoice"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sales_order"("p_cid" bigint, "p_sales_agent" bigint, "p_discount" numeric, "p_items" "jsonb") RETURNS TABLE("order_id" bigint)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_approval_status text;
begin
  -- 1️⃣ Compute subtotal
  select sum(
    (i->>'quantity')::numeric * (i->>'price')::numeric
  )
  into v_subtotal
  from jsonb_array_elements(p_items) i;

  v_total := v_subtotal - coalesce(p_discount, 0);

  if v_total < 0 then
    raise exception 'Total price cannot be negative';
  end if;

  -- 2️⃣ Approval logic (based on sales_agent role)
  select
    case
      when u.role = 'admin' then 'Not Required'
      else 'Required'
    end
  into v_approval_status
  from users u
  where u.id = p_sales_agent;

  if not found then
    raise exception 'Sales agent not found';
  end if;

  -- 3️⃣ Insert sales order
  insert into sales_orders (
    cid,
    sales_agent,
    order_date,
    discount,
    total_price,
    status,
    approval_status
  )
  values (
    p_cid,
    p_sales_agent,
    current_date,
    coalesce(p_discount, 0),
    v_total,
    'Open',
    v_approval_status
  )
  returning sales_orders.id into order_id;

  -- 4️⃣ Insert sales order items
  insert into sales_order_items (
    sales_order_id,
    item_id,
    quantity,
    price
  )
  select
    order_id,
    (i->>'item_id')::bigint,
    (i->>'quantity')::numeric,
    (i->>'price')::numeric
  from jsonb_array_elements(p_items) i;

  return;
end;
$$;


ALTER FUNCTION "public"."create_sales_order"("p_cid" bigint, "p_sales_agent" bigint, "p_discount" numeric, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sales_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$declare
  v_return_id bigint;
  v_item jsonb;
  v_invoice_item record;
  v_return_qty numeric;
begin
  -- validate first
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_return_qty := (v_item->>'return_qty')::numeric;

    select id, item_id, quantity, coalesce(return_qty, 0) as returned_qty
    into v_invoice_item
    from sales_invoice_items
    where id = (v_item->>'invoice_item_id')::bigint
      and sales_invoice_id = p_invoice_id;

    if not found then
      raise exception 'Invalid invoice item id: %', v_item->>'invoice_item_id';
    end if;

    if v_return_qty <= 0 then
      raise exception 'Return quantity must be greater than 0';
    end if;

    if v_invoice_item.returned_qty + v_return_qty > v_invoice_item.quantity then
      raise exception 'Return quantity exceeds remaining quantity';
    end if;
  end loop;

  insert into sales_returns (invoice_id, reason, return_number)
  values (
    p_invoice_id,
    p_reason,
    'SR-' || lpad(nextval('sales_return_number_seq')::text, 6, '0')
  )
  returning id into v_return_id;

  -- process items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_return_qty := (v_item->>'return_qty')::numeric;

    select id, item_id, quantity, coalesce(return_qty, 0) as returned_qty
    into v_invoice_item
    from sales_invoice_items
    where id = (v_item->>'invoice_item_id')::bigint
      and sales_invoice_id = p_invoice_id;

    insert into sales_return_items (
      return_id,
      invoice_item_id,
      product_id,
      return_qty,
      remaining_qty
    )
    values (
      v_return_id,
      v_invoice_item.id,
      v_invoice_item.item_id,
      v_return_qty,
      v_invoice_item.quantity - (v_invoice_item.returned_qty + v_return_qty)
    );

    update sales_invoice_items
    set return_qty = coalesce(return_qty, 0) + v_return_qty
    where id = v_invoice_item.id;

    update products
    set stock = coalesce(stock, 0) + v_return_qty
    where id = v_invoice_item.item_id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'return_number', (
      select return_number
      from sales_returns
      where id = v_return_id
    )
  );
end;$$;


ALTER FUNCTION "public"."create_sales_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."supplier_invoices" (
    "id" bigint NOT NULL,
    "po_number" "text",
    "purchase_date" "date" NOT NULL,
    "supplier_id" integer NOT NULL,
    "conversion_factor" numeric(10,4) DEFAULT 1,
    "status" "text" DEFAULT 'PENDING'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "invoice_number" "text"
);


ALTER TABLE "public"."supplier_invoices" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_supplier_invoice"("invoice_data" "jsonb", "items" "jsonb") RETURNS "public"."supplier_invoices"
    LANGUAGE "plpgsql"
    AS $$declare
  new_invoice supplier_invoices;
begin
  -- Insert supplier invoice
  insert into supplier_invoices (
    po_number,
    purchase_date,
    supplier_id,
    conversion_factor,
    invoice_number,
    status
  )
  values (
    invoice_data->>'po_number',
    (invoice_data->>'purchase_date')::date,
    (invoice_data->>'supplier_id')::int,
    coalesce((invoice_data->>'conversion_factor')::numeric, 1),
    invoice_data->>'invoice_number',
    'PENDING'
  )
  returning * into new_invoice;

  -- Insert invoice items
  insert into supplier_invoice_items (
    invoice_id,
    product_id,
    quantity,
    unit_cost,
    subtotal
  )
  select
    new_invoice.id,
    (item->>'product_id')::int,
    (item->>'quantity')::int,
    (item->>'unit_cost')::numeric(10,2),
    ((item->>'quantity')::numeric * (item->>'unit_cost')::numeric)::numeric(12,2)
  from jsonb_array_elements(items) as item;

  return new_invoice;
end;$$;


ALTER FUNCTION "public"."create_supplier_invoice"("invoice_data" "jsonb", "items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_supplier_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_return_id bigint;
  v_item record;
  v_invoice_item record;
  v_remaining numeric;
begin
  insert into supplier_return (invoice_id, reason)
  values (p_invoice_id, p_reason)
  returning id into v_return_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items)
    as x(item_id bigint, ret_qty numeric)
  loop

    select *
    into v_invoice_item
    from supplier_invoice_items
    where id = v_item.item_id
      and invoice_id = p_invoice_id;

    if not found then
      raise exception 'Invoice item % not found', v_item.item_id;
    end if;

    if v_item.ret_qty <= 0 then
      raise exception 'Return quantity must be greater than 0';
    end if;

    if coalesce(v_invoice_item.ret_qty, 0) + v_item.ret_qty > v_invoice_item.quantity then
      raise exception 'Return quantity exceeds purchased quantity';
    end if;

    v_remaining :=
      v_invoice_item.quantity
      - (coalesce(v_invoice_item.ret_qty, 0) + v_item.ret_qty);

    insert into supplier_return_items (
      return_id,
      item_id,
      product_id,
      ret_qty,
      rem_qty
    )
    values (
      v_return_id,
      v_invoice_item.id,
      v_invoice_item.product_id,
      v_item.ret_qty,
      v_remaining
    );

    update supplier_invoice_items
    set ret_qty = coalesce(ret_qty, 0) + v_item.ret_qty
    where id = v_invoice_item.id;

    update products
    set stock = stock - v_item.ret_qty
    where id = v_invoice_item.product_id;

  end loop;

  return jsonb_build_object(
    'return_id', v_return_id,
    'message', 'Supplier return created successfully'
  );
end;
$$;


ALTER FUNCTION "public"."create_supplier_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_sales_order"("p_order_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Lock order first
  if not exists (
    select 1
    from sales_orders
    where id = p_order_id
    for update
  ) then
    raise exception 'Sales order % not found', p_order_id;
  end if;

  -- Delete children
  delete from sales_order_items
  where sales_order_id = p_order_id;

  -- Delete parent
  delete from sales_orders
  where id = p_order_id;

end;
$$;


ALTER FUNCTION "public"."delete_sales_order"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invoices_by_product"("p_product_id" integer) RETURNS json
    LANGUAGE "sql"
    AS $$select json_agg(
  json_build_object(
    'unit_cost', sii.unit_cost,
    'quantity', sii.quantity,
    'supplier_invoices', json_build_object(
        'id', si.id,
        'po_number', si.po_number,
        'suppliers', json_build_object(
            'id', s.id,
            'name', s.name,
            'currency', s.currency
        ),
        'purchase_date', si.purchase_date,
        'invoice_number', si.invoice_number,
        'conversion_factor', si.conversion_factor
    ),
    'products', json_build_object(
        'id', p.id,
        'item_name', p.item_name
    )
  ) ORDER BY si.purchase_date DESC
)
from supplier_invoice_items sii
join supplier_invoices si on si.id = sii.invoice_id
join suppliers s on s.id = si.supplier_id
join products p on p.id = sii.product_id
where sii.product_id = p_product_id;$$;


ALTER FUNCTION "public"."get_invoices_by_product"("p_product_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_served_orders_by_item"("p_item_id" bigint) RETURNS TABLE("order_id" bigint, "order_date" "date", "customer_name" "text", "status" "text", "item_id" bigint, "quantity" numeric, "serve_qty" integer, "price" numeric)
    LANGUAGE "sql"
    AS $$select
    so.id,
    so.order_date,
    c.name as customer_name,
    so.status,
    soi.item_id,
    soi.quantity,
    soi.serve_qty,
    soi.price
  from sales_orders so
  join sales_order_items soi
    on soi.sales_order_id = so.id
  join customers c
    on c.id = so.cid
  where so.status in ('Served', 'Partial Served', 'Invoiced')
    and soi.item_id = p_item_id
  order by so.order_date desc;$$;


ALTER FUNCTION "public"."get_served_orders_by_item"("p_item_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_product_stock"("p_product_id" integer, "p_qty" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update products
  set stock = stock + p_qty
  where id = p_product_id;
end;
$$;


ALTER FUNCTION "public"."increment_product_stock"("p_product_id" integer, "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  v_invoice supplier_invoices;
  v_item supplier_invoice_items;
  v_base_cost numeric;
  v_price1 numeric;
  v_price2 numeric;
  v_price3 numeric;
begin
  -- 1. Fetch and lock invoice
  select *
  into v_invoice
  from supplier_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status <> 'PENDING' then
    raise exception 'Invoice already posted';
  end if;

  -- 2. Loop through invoice items
  for v_item in
    select *
    from supplier_invoice_items
    where invoice_id = p_invoice_id
  loop
    v_base_cost :=
      round(
        v_item.unit_cost * coalesce(v_invoice.conversion_factor, 1),
        4
      );

    -- Price calculations (same as JS)
    v_price1 := round(v_base_cost * 1.5, 2);
    v_price2 := round(v_base_cost * 1.4, 2);
    v_price3 := round(v_base_cost * 1.3, 2);

    -- 2a. Increment stock
    update products
    set stock = stock + v_item.quantity
    where id = v_item.product_id;

    if not found then
      raise exception 'Product % not found', v_item.product_id;
    end if;

    -- 2b. Update cost and prices
    update products
    set
      cost = v_base_cost,
      price1 = v_price1,
      price2 = v_price2,
      price3 = v_price3
    where id = v_item.product_id;
  end loop;

  -- 3. Mark invoice as POSTED
  update supplier_invoices
  set status = 'POSTED'
  where id = p_invoice_id;

end;$$;


ALTER FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_serve_order"("p_order_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_status text;
begin
  -- 1. Lock and read order
  select status
  into v_status
  from sales_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- 2. Hard guards
  if v_status = 'Invoiced' then
    raise exception 'Cannot reject an invoiced order';
  end if;

  if v_status in ('Served', 'Partial Served') then
    raise exception 'Order already served and cannot be rejected';
  end if;

  if v_status <> 'For Approval' then
    raise exception 'Order is not pending approval';
  end if;

  -- 3. Reset serve quantities
  update sales_order_items
  set serve_qty = 0
  where sales_order_id = p_order_id;

  -- 4. Revert order status
  update sales_orders
  set status = 'Open'
  where id = p_order_id;

end;
$$;


ALTER FUNCTION "public"."reject_serve_order"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_serve_order"("p_order_id" bigint, "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item record;
  v_order_item sales_order_items;
begin
  -- 1. Lock and validate order
  perform 1
  from sales_orders
  where id = p_order_id
    and status in ('Open', 'Partial Served')
  for update;

  if not found then
    raise exception 'Order not found or not serveable';
  end if;

  -- 2. Loop through requested items
  for v_item in
    select *
    from jsonb_to_recordset(p_items)
    as x(
      order_item_id bigint,
      serve_qty integer
    )
  loop
    -- 3. Lock order item
    select *
    into v_order_item
    from sales_order_items
    where id = v_item.order_item_id
      and sales_order_id = p_order_id
    for update;

    if not found then
      raise exception 'Order item not found';
    end if;

    -- 4. Validate serve quantity
    if v_item.serve_qty < 0 then
      raise exception 'Serve quantity must be >= 0';
    end if;

    if v_item.serve_qty > v_order_item.quantity then
      raise exception 'Serve qty exceeds ordered qty';
    end if;

    -- 5. Save requested serve qty (NO STOCK CHANGE)
    update sales_order_items
    set serve_qty = v_item.serve_qty
    where id = v_order_item.id;
  end loop;

  -- 6. Move order to approval
  update sales_orders
  set status = 'For Approval'
  where id = p_order_id;

end;
$$;


ALTER FUNCTION "public"."request_serve_order"("p_order_id" bigint, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."return_invoice_item"("p_invoice_id" bigint, "p_invoice_item_id" bigint, "p_return_qty" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_product_id bigint;
    v_quantity integer;
    v_returned integer;
BEGIN
    -- 1️⃣ Get the invoice item and validate it belongs to the invoice
    SELECT item_id, quantity, COALESCE(returned_quantity, 0)
    INTO v_product_id, v_quantity, v_returned
    FROM sales_invoice_items
    WHERE id = p_invoice_item_id
      AND sales_invoice_id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice item not found for this invoice';
    END IF;

    -- 2️⃣ Validate return quantity
    IF p_return_qty <= 0 THEN
        RAISE EXCEPTION 'Return quantity must be greater than zero';
    END IF;

    IF v_returned + p_return_qty > v_quantity THEN
        RAISE EXCEPTION 'Cannot return more than purchased quantity';
    END IF;

    -- 3️⃣ Update returned quantity
    UPDATE sales_invoice_items
    SET returned_quantity = v_returned + p_return_qty
    WHERE id = p_invoice_item_id;

    -- 4️⃣ Update product stock
    UPDATE products
    SET stock = stock + p_return_qty
    WHERE id = v_product_id;
END;
$$;


ALTER FUNCTION "public"."return_invoice_item"("p_invoice_id" bigint, "p_invoice_item_id" bigint, "p_return_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."serve_order"("p_order_id" bigint, "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item record;
  v_order_item sales_order_items;
  v_product products;
  v_all_served boolean;
begin
  -- 1. Lock and validate order
  perform 1
  from sales_orders
  where id = p_order_id
    and status <> 'Invoiced'
  for update;

  if not found then
    raise exception 'Order not found or already invoiced';
  end if;

  -- 2. Loop through items
  for v_item in
    select *
    from jsonb_to_recordset(p_items)
    as x(
      order_item_id bigint,
      serve_qty integer
    )
  loop
    -- 3. Lock order item
    select *
    into v_order_item
    from sales_order_items
    where id = v_item.order_item_id
      and sales_order_id = p_order_id
    for update;

    if not found then
      raise exception 'Order item not found';
    end if;

    -- 4. Validate quantity
    if v_item.serve_qty <= 0 then
      raise exception 'Serve quantity must be greater than zero';
    end if;

    if v_order_item.serve_qty + v_item.serve_qty > v_order_item.quantity then
      raise exception 'Serve qty exceeds ordered qty';
    end if;

    -- 5. Lock product
    select *
    into v_product
    from products
    where id = v_order_item.item_id
    for update;

    if v_product.stock < v_item.serve_qty then
      raise exception 'Insufficient stock';
    end if;

    -- 6. Update serve qty
    update sales_order_items
    set serve_qty = serve_qty + v_item.serve_qty
    where id = v_order_item.id;

    -- 7. Decrease stock
    update products
    set stock = stock - v_item.serve_qty
    where id = v_product.id;
  end loop;

  -- 8. Update order status
  select bool_and(serve_qty = quantity)
  into v_all_served
  from sales_order_items
  where sales_order_id = p_order_id;

  update sales_orders
  set status = case
    when v_all_served then 'Served'
    else 'Partial Served'
  end
  where id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."serve_order"("p_order_id" bigint, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unserve_order"("p_order_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item record;
begin
  -- 1. Lock the order
  perform 1
  from sales_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- 2. Loop through served items
  for v_item in
    select item_id, serve_qty
    from sales_order_items
    where sales_order_id = p_order_id
      and serve_qty > 0
  loop
    -- 3. Return stock
    update products
    set stock = stock + v_item.serve_qty
    where id = v_item.item_id;
  end loop;

  -- 4. Reset serve quantities
  update sales_order_items
  set serve_qty = 0
  where sales_order_id = p_order_id;

  -- 5. Reset order status
  update sales_orders
  set status = 'Open'
  where id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."unserve_order"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sales_order"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  v_order_id   bigint := (payload->>'order_id')::bigint;
  v_cid        bigint := (payload->>'cid')::bigint;
  v_order_date date   := (payload->>'order_date')::date;
  v_discount   numeric := coalesce((payload->>'discount')::numeric, 0);
  v_items      jsonb  := payload->'items';
  v_subtotal   numeric := 0;
  v_total      numeric;
  v_item       jsonb;
  v_next_id    bigint;
begin
  -- 1. Lock order
  if not exists (
    select 1
    from sales_orders
    where id = v_order_id
    for update
  ) then
    raise exception 'Sales order not found';
  end if;

  -- 2. Compute subtotal
  for v_item in
    select * from jsonb_array_elements(v_items)
  loop
    v_subtotal :=
      v_subtotal
      + (v_item->>'quantity')::numeric
      * (v_item->>'price')::numeric;
  end loop;

  v_total := v_subtotal - v_discount;

  -- 3. Update sales order header
  update sales_orders
  set
    cid = v_cid,
    order_date = v_order_date,
    discount = v_discount,
    total_price = v_total
  where id = v_order_id;

  -- 4. Delete removed items FIRST (before updates/inserts)
  delete from sales_order_items
  where sales_order_id = v_order_id
    and item_id not in (
      select (item->>'item_id')::bigint
      from jsonb_array_elements(v_items) item
    );

  -- 5. Update existing line items
  update sales_order_items soi
  set
    quantity = (item->>'quantity')::numeric,
    price    = (item->>'price')::numeric
  from jsonb_array_elements(v_items) item
  where
    item ? 'id'
    and soi.id = (item->>'id')::bigint
    and soi.sales_order_id = v_order_id;

  -- 6. Get next safe ID
  select coalesce(max(id), 0) + 1 into v_next_id from sales_order_items;
  
  perform setval(
    pg_get_serial_sequence('sales_order_items', 'id'),
    v_next_id + (
      select count(*)
      from jsonb_array_elements(v_items) item
      where not (item ? 'id')
    ) - 1,
    true
  );

  -- 7. Insert newly added items
  insert into sales_order_items (
    id,
    sales_order_id,
    item_id,
    quantity,
    price
  )
  select
    v_next_id + row_number() over () - 1,
    v_order_id,
    (item->>'item_id')::bigint,
    (item->>'quantity')::numeric,
    (item->>'price')::numeric
  from jsonb_array_elements(v_items) item
  where not (item ? 'id');

end;$$;


ALTER FUNCTION "public"."update_sales_order"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_supplier_invoice"("p_invoice_id" integer, "p_po_number" "text", "p_purchase_date" "date", "p_supplier_id" integer, "p_conversion_factor" numeric, "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  v_status text;
begin
  -- 1️⃣ Lock and validate invoice
  select status
  into v_status
  from supplier_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Supplier invoice not found';
  end if;

  if v_status = 'Posted' then
    raise exception 'Cannot edit Posted invoice';
  end if;

  -- 2️⃣ Update invoice header
  update supplier_invoices
  set
    po_number = p_po_number,
    purchase_date = p_purchase_date,
    supplier_id = p_supplier_id,
    conversion_factor = p_conversion_factor
  where id = p_invoice_id;

  -- 3️⃣ Replace items
  delete from supplier_invoice_items
  where invoice_id = p_invoice_id;

  insert into supplier_invoice_items (
    invoice_id,
    product_id,
    quantity,
    unit_cost,
    subtotal
  )
  select
    p_invoice_id,
    (i->>'product_id')::int,
    (i->>'quantity')::int,
    (i->>'unit_cost')::numeric,
    ((i->>'quantity')::numeric * (i->>'unit_cost')::numeric)
  from jsonb_array_elements(p_items) i;

end;$$;


ALTER FUNCTION "public"."update_supplier_invoice"("p_invoice_id" integer, "p_po_number" "text", "p_purchase_date" "date", "p_supplier_id" integer, "p_conversion_factor" numeric, "p_items" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "number" "text",
    "address" "text",
    "tin" "text",
    "terms" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "pic" "text",
    "city" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


ALTER TABLE "public"."customers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."customers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory_adjustments" (
    "id" bigint NOT NULL,
    "adjustment_date" "date" NOT NULL,
    "product_id" integer NOT NULL,
    "from_quantity" integer NOT NULL,
    "to_quantity" integer NOT NULL,
    "adjusted_quantity" integer NOT NULL,
    "pic" integer,
    "remarks" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_adjustments" OWNER TO "postgres";


ALTER TABLE "public"."inventory_adjustments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_adjustments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "item_code" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "brand" "text",
    "origin" "text",
    "min_stock" integer,
    "stock" integer DEFAULT 0,
    "cost" numeric(10,2),
    "price1" numeric(10,2),
    "price2" numeric(10,2),
    "price3" numeric(10,2),
    "price4" numeric(10,2),
    "part_num" "text",
    "internal_num" "text",
    "unit" "text" DEFAULT 'PC'::"text",
    "model" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_invoice_items" (
    "id" bigint NOT NULL,
    "sales_invoice_id" integer NOT NULL,
    "item_id" bigint NOT NULL,
    "quantity" integer NOT NULL,
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "return_qty" numeric DEFAULT 0
);


ALTER TABLE "public"."sales_invoice_items" OWNER TO "postgres";


ALTER TABLE "public"."sales_invoice_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_invoice_items_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_invoices" (
    "id" bigint NOT NULL,
    "order_id" integer NOT NULL,
    "cid" integer NOT NULL,
    "sales_agent" bigint,
    "waybill_number" "text",
    "courier" "text",
    "invoice_date" "date",
    "invoice_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total_price" numeric,
    "shipping_date" "date"
);


ALTER TABLE "public"."sales_invoices" OWNER TO "postgres";


ALTER TABLE "public"."sales_invoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_invoices_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" bigint NOT NULL,
    "sales_order_id" integer,
    "item_id" bigint NOT NULL,
    "quantity" numeric NOT NULL,
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "serve_qty" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."sales_order_items" OWNER TO "postgres";


ALTER TABLE "public"."sales_order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_order_items_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" bigint NOT NULL,
    "order_date" "date" NOT NULL,
    "cid" bigint NOT NULL,
    "status" "text",
    "total_price" numeric,
    "discount" numeric DEFAULT 0,
    "sales_agent" bigint NOT NULL,
    "approval_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "approval_status_check" CHECK (("approval_status" = ANY (ARRAY['Required'::"text", 'Approved'::"text", 'Rejected'::"text", 'Not Required'::"text"]))),
    CONSTRAINT "sales_orders_status_check" CHECK (("status" = ANY (ARRAY['Open'::"text", 'For Approval'::"text", 'Served'::"text", 'Partial Served'::"text", 'Invoiced'::"text", 'Partial Invoiced'::"text"])))
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


ALTER TABLE "public"."sales_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sales_orders_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_return_items" (
    "id" bigint NOT NULL,
    "return_id" bigint NOT NULL,
    "invoice_item_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "return_qty" numeric NOT NULL,
    "remaining_qty" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_return_items" OWNER TO "postgres";


ALTER TABLE "public"."sales_return_items" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."sales_return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."sales_return_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_return_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_returns" (
    "id" bigint NOT NULL,
    "invoice_id" bigint NOT NULL,
    "return_date" timestamp without time zone DEFAULT "now"(),
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "return_number" "text"
);


ALTER TABLE "public"."sales_returns" OWNER TO "postgres";


ALTER TABLE "public"."sales_returns" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."sales_returns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" bigint NOT NULL,
    "sid" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "currency" "text",
    "number" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE "public"."suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."supplier_invoice_items" (
    "id" bigint NOT NULL,
    "invoice_id" bigint NOT NULL,
    "product_id" integer NOT NULL,
    "quantity" integer NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    "subtotal" numeric(12,2) NOT NULL,
    "ret_qty" numeric DEFAULT 0
);


ALTER TABLE "public"."supplier_invoice_items" OWNER TO "postgres";


ALTER TABLE "public"."supplier_invoice_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_invoice_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."supplier_invoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_invoices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."supplier_return" (
    "id" bigint NOT NULL,
    "invoice_id" bigint,
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_return" OWNER TO "postgres";


ALTER TABLE "public"."supplier_return" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_return_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."supplier_return_items" (
    "id" bigint NOT NULL,
    "return_id" bigint,
    "item_id" bigint,
    "product_id" bigint,
    "ret_qty" numeric NOT NULL,
    "rem_qty" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_return_items" OWNER TO "postgres";


ALTER TABLE "public"."supplier_return_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplier_return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "username" "text" NOT NULL,
    "password" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "customers_customer_code_key" UNIQUE ("sid");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_item_code_key" UNIQUE ("item_code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_invoice_items"
    ADD CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_invoices"
    ADD CONSTRAINT "sales_invoices_order_unique" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."sales_invoices"
    ADD CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_return_items"
    ADD CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_returns"
    ADD CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_returns"
    ADD CONSTRAINT "sales_returns_return_number_key" UNIQUE ("return_number");



ALTER TABLE ONLY "public"."supplier_invoice_items"
    ADD CONSTRAINT "supplier_invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_return_items"
    ADD CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_return"
    ADD CONSTRAINT "supplier_return_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sales_invoice_items"
    ADD CONSTRAINT "sales_invoice_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sales_invoice_items"
    ADD CONSTRAINT "sales_invoice_items_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id");



ALTER TABLE ONLY "public"."sales_invoices"
    ADD CONSTRAINT "sales_invoices_cid_fkey" FOREIGN KEY ("cid") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales_invoices"
    ADD CONSTRAINT "sales_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."sales_invoices"
    ADD CONSTRAINT "sales_invoices_sales_agent_fkey" FOREIGN KEY ("sales_agent") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_cid_fkey" FOREIGN KEY ("cid") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_sales_agent_fkey" FOREIGN KEY ("sales_agent") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_return_items"
    ADD CONSTRAINT "sales_return_items_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."sales_invoice_items"("id");



ALTER TABLE ONLY "public"."sales_return_items"
    ADD CONSTRAINT "sales_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sales_return_items"
    ADD CONSTRAINT "sales_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id");



ALTER TABLE ONLY "public"."sales_returns"
    ADD CONSTRAINT "sales_returns_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id");



ALTER TABLE ONLY "public"."supplier_invoice_items"
    ADD CONSTRAINT "supplier_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."supplier_invoices"("id");



ALTER TABLE ONLY "public"."supplier_invoice_items"
    ADD CONSTRAINT "supplier_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."supplier_return"
    ADD CONSTRAINT "supplier_return_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."supplier_invoices"("id");



ALTER TABLE ONLY "public"."supplier_return_items"
    ADD CONSTRAINT "supplier_return_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."supplier_invoice_items"("id");



ALTER TABLE ONLY "public"."supplier_return_items"
    ADD CONSTRAINT "supplier_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."supplier_return_items"
    ADD CONSTRAINT "supplier_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."supplier_return"("id");



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_returns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_return" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_serve_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."approve_serve_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_serve_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sales_invoice"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."create_sales_invoice"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sales_invoice"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sales_order"("p_cid" bigint, "p_sales_agent" bigint, "p_discount" numeric, "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sales_order"("p_cid" bigint, "p_sales_agent" bigint, "p_discount" numeric, "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sales_order"("p_cid" bigint, "p_sales_agent" bigint, "p_discount" numeric, "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sales_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sales_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sales_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."supplier_invoices" TO "anon";
GRANT ALL ON TABLE "public"."supplier_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_invoices" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_supplier_invoice"("invoice_data" "jsonb", "items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_supplier_invoice"("invoice_data" "jsonb", "items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_supplier_invoice"("invoice_data" "jsonb", "items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_supplier_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_supplier_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_supplier_return"("p_invoice_id" bigint, "p_reason" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_sales_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_sales_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_sales_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invoices_by_product"("p_product_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_invoices_by_product"("p_product_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invoices_by_product"("p_product_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_served_orders_by_item"("p_item_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_served_orders_by_item"("p_item_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_served_orders_by_item"("p_item_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" integer, "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" integer, "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" integer, "p_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_serve_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."reject_serve_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_serve_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."request_serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."request_serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."return_invoice_item"("p_invoice_id" bigint, "p_invoice_item_id" bigint, "p_return_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."return_invoice_item"("p_invoice_id" bigint, "p_invoice_item_id" bigint, "p_return_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."return_invoice_item"("p_invoice_id" bigint, "p_invoice_item_id" bigint, "p_return_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."serve_order"("p_order_id" bigint, "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."unserve_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."unserve_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unserve_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sales_order"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_sales_order"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sales_order"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_supplier_invoice"("p_invoice_id" integer, "p_po_number" "text", "p_purchase_date" "date", "p_supplier_id" integer, "p_conversion_factor" numeric, "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_supplier_invoice"("p_invoice_id" integer, "p_po_number" "text", "p_purchase_date" "date", "p_supplier_id" integer, "p_conversion_factor" numeric, "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_supplier_invoice"("p_invoice_id" integer, "p_po_number" "text", "p_purchase_date" "date", "p_supplier_id" integer, "p_conversion_factor" numeric, "p_items" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales_invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_invoice_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_invoice_items_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_invoice_items_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_invoice_items_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."sales_invoices" TO "anon";
GRANT ALL ON TABLE "public"."sales_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_invoices_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_invoices_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_invoices_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_order_items_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_order_items_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_order_items_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."sales_return_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_return_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_return_items_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_return_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_return_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_return_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales_returns" TO "anon";
GRANT ALL ON TABLE "public"."sales_returns" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_returns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_returns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_returns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_returns_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_invoice_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_invoice_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_invoice_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_invoice_items_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_return" TO "anon";
GRANT ALL ON TABLE "public"."supplier_return" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_return" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_return_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_return_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_return_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_return_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_return_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_return_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







