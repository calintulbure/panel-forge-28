-- Drop unique indexes on erp_product_code
DROP INDEX IF EXISTS public.products_erp_product_code_unique;
DROP INDEX IF EXISTS public.products_uniq_erp_code;
DROP INDEX IF EXISTS public.products_erp_product_code_articol_id_idx;

-- Keep: products_pkey (primary key on articol_id) and idx_products_validated