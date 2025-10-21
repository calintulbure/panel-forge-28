create or replace function public.bulk_upsert_products(payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Stage incoming rows as typed columns
  create temp table tmp_products on commit drop as
  select *
  from jsonb_to_recordset(payload) as t(
    categ1                   text,
    categ2                   text,
    categ3                   text,
    articol_id               bigint,
    erp_product_code         text,
    erp_product_description  text,
    stare_oferta             text,
    stare_stoc               text,
    senior_erp_link          text
  );

  -- Upsert (insert new; update only mutable columns)
  insert into public.products as p (
    categ1, categ2, categ3, articol_id,
    erp_product_code, erp_product_description,
    stare_oferta, stare_stoc, senior_erp_link
  )
  select
    categ1, categ2, categ3, articol_id,
    erp_product_code, erp_product_description,
    stare_oferta, stare_stoc, senior_erp_link
  from tmp_products
  on conflict (erp_product_code) do update
  set
    categ1                  = coalesce(excluded.categ1,                  p.categ1),
    categ2                  = coalesce(excluded.categ2,                  p.categ2),
    categ3                  = coalesce(excluded.categ3,                  p.categ3),
    erp_product_description = coalesce(excluded.erp_product_description, p.erp_product_description),
    stare_oferta            = coalesce(excluded.stare_oferta,            p.stare_oferta),
    stare_stoc              = coalesce(excluded.stare_stoc,              p.stare_stoc),
    senior_erp_link         = coalesce(excluded.senior_erp_link,         p.senior_erp_link);

  get diagnostics v_count = row_count;
  return v_count;
end $$;