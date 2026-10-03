-- Bulk status update via RPC instead of PostgREST's .in() filter. .in()
-- encodes the id list into the request's query string, which starts
-- failing (plain "Bad Request" from the gateway, no useful detail) once
-- the list gets long enough -- confirmed in this project's case somewhere
-- around 17-19KB of ids, i.e. selecting a few thousand rows at once on the
-- Dormant Products "select all" checkbox. An RPC call sends its arguments
-- in the request body instead, which has no comparable practical limit.

create or replace function public.bulk_update_product_status(
  p_ids integer[],
  p_status text
) returns setof public.products
language sql
as $$
  update public.products
     set status = p_status
   where id = any(p_ids)
  returning *;
$$;

alter function public.bulk_update_product_status(integer[], text) owner to postgres;
grant execute on function public.bulk_update_product_status(integer[], text) to service_role;
