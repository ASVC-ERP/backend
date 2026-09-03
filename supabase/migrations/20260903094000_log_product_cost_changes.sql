-- Cost tracking, part 5 of the R0 series.
--
-- Write a product_cost_history row from the two paths that change products.cost:
--   1. post_supplier_invoice  -> source 'purchase', ref_id = supplier invoice id
--   2. adjust_product_cost    -> source 'manual', changed_by = acting user
--      (new function; the /product/:id/cost service switches to calling it)

-- 1. post_supplier_invoice: unchanged behaviour + a history insert per changed item
CREATE OR REPLACE FUNCTION "public"."post_supplier_invoice"("p_invoice_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  v_invoice supplier_invoices;
  v_item supplier_invoice_items;
  v_base_cost numeric;
  v_old_cost numeric;
  v_price1 numeric;
  v_price2 numeric;
  v_price3 numeric;
begin
  select * into v_invoice from supplier_invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if v_invoice.status <> 'PENDING' then
    raise exception 'Invoice already posted';
  end if;

  for v_item in
    select * from supplier_invoice_items where invoice_id = p_invoice_id
  loop
    v_base_cost := round(v_item.unit_cost * coalesce(v_invoice.conversion_factor, 1), 4);
    v_price1 := round(v_base_cost * 1.5, 2);
    v_price2 := round(v_base_cost * 1.4, 2);
    v_price3 := round(v_base_cost * 1.3, 2);

    update products set stock = stock + v_item.quantity where id = v_item.product_id;
    if not found then
      raise exception 'Product % not found', v_item.product_id;
    end if;

    select cost into v_old_cost from products where id = v_item.product_id;

    update products
    set cost = v_base_cost, price1 = v_price1, price2 = v_price2, price3 = v_price3
    where id = v_item.product_id;

    if v_old_cost is distinct from v_base_cost then
      insert into product_cost_history (product_id, old_cost, new_cost, source, ref_id)
      values (v_item.product_id, v_old_cost, v_base_cost, 'purchase', p_invoice_id);
    end if;
  end loop;

  update supplier_invoices set status = 'POSTED' where id = p_invoice_id;
end;$$;

-- 2. adjust_product_cost: replaces the raw UPDATE in product.service.adjust_cost,
--    doing the cost/price update and the history insert atomically.
CREATE OR REPLACE FUNCTION "public"."adjust_product_cost"(
  "p_id" bigint,
  "p_cost" numeric,
  "p_changed_by" bigint DEFAULT NULL
) RETURNS "public"."products"
    LANGUAGE "plpgsql"
    AS $$declare
  v_old_cost numeric;
  v_row products;
begin
  select cost into v_old_cost from products where id = p_id;
  if not found then
    raise exception 'Product % not found', p_id;
  end if;

  update products
  set cost   = p_cost,
      price1 = round(p_cost * 1.5),
      price2 = round(p_cost * 1.4),
      price3 = round(p_cost * 1.3)
  where id = p_id
  returning * into v_row;

  if v_old_cost is distinct from p_cost then
    insert into product_cost_history (product_id, old_cost, new_cost, source, changed_by)
    values (p_id, v_old_cost, p_cost, 'manual', p_changed_by);
  end if;

  return v_row;
end;$$;

alter function "public"."adjust_product_cost"(bigint, numeric, bigint) owner to "postgres";
grant execute on function "public"."adjust_product_cost"(bigint, numeric, bigint) to "service_role";
