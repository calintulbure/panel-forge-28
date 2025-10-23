-- Fix search_path security issue in update_products_from_sources function
create or replace function public.update_products_from_sources(
  run_ro boolean default true,
  run_hu boolean default true,
  validated_only boolean default true
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ro_count integer := 0;
  hu_count integer := 0;
begin
  if run_ro then
    update products p
       set yliro_sku   = r.sku,
           site_ro_url = r.url_key
      from yli_ro_products r
     where p.erp_product_code = r.sku
       and (validated_only is false or p.validated is not true);

    get diagnostics ro_count = row_count;
  end if;

  if run_hu then
    update products p
       set ylihu_sku   = h.sku,
           site_hu_url = h.url_key
      from yli_hu_products h
     where p.erp_product_code = h.sku
       and (validated_only is false or p.validated is not true);

    get diagnostics hu_count = row_count;
  end if;

  return json_build_object('updated_ro', ro_count, 'updated_hu', hu_count);
end;
$$;