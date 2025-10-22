-- Add new columns to products table if they don't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS site_ro_product_id integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS site_hu_product_id integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ro_stock integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ro_stoc_detailed text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hu_stock integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hu_stock_detailed text;

-- Update bulk_upsert_products function to handle new fields
CREATE OR REPLACE FUNCTION public.bulk_upsert_products(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    senior_erp_link          text,
    site_ro_product_id       int,
    site_hu_product_id       int,
    ro_stock                 int,
    ro_stoc_detailed         text,
    hu_stock                 int,
    hu_stock_detailed        text
  );

  -- Upsert (insert new; update only mutable columns)
  insert into public.products as p (
    categ1, categ2, categ3, articol_id,
    erp_product_code, erp_product_description,
    stare_oferta, stare_stoc, senior_erp_link,
    site_ro_product_id, site_hu_product_id,
    ro_stock, ro_stoc_detailed,
    hu_stock, hu_stock_detailed
  )
  select
    categ1, categ2, categ3, articol_id,
    erp_product_code, erp_product_description,
    stare_oferta, stare_stoc, senior_erp_link,
    site_ro_product_id, site_hu_product_id,
    ro_stock, ro_stoc_detailed,
    hu_stock, hu_stock_detailed
  from tmp_products
  on conflict (erp_product_code) do update
  set
    categ1                  = coalesce(excluded.categ1,                  p.categ1),
    categ2                  = coalesce(excluded.categ2,                  p.categ2),
    categ3                  = coalesce(excluded.categ3,                  p.categ3),
    erp_product_description = coalesce(excluded.erp_product_description, p.erp_product_description),
    stare_oferta            = coalesce(excluded.stare_oferta,            p.stare_oferta),
    stare_stoc              = coalesce(excluded.stare_stoc,              p.stare_stoc),
    senior_erp_link         = coalesce(excluded.senior_erp_link,         p.senior_erp_link),
    site_ro_product_id      = coalesce(excluded.site_ro_product_id,      p.site_ro_product_id),
    site_hu_product_id      = coalesce(excluded.site_hu_product_id,      p.site_hu_product_id),
    ro_stock                = coalesce(excluded.ro_stock,                p.ro_stock),
    ro_stoc_detailed        = coalesce(excluded.ro_stoc_detailed,        p.ro_stoc_detailed),
    hu_stock                = coalesce(excluded.hu_stock,                p.hu_stock),
    hu_stock_detailed       = coalesce(excluded.hu_stock_detailed,       p.hu_stock_detailed);

  get diagnostics v_count = row_count;
  return v_count;
end $function$;
