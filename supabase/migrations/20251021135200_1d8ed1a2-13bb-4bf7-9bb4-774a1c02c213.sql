-- Drop constraints and indexes (must drop constraints, not just indexes)
DROP INDEX IF EXISTS products_erp_product_code_article_id_idx;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_article_id_unique;

-- Rename column from article_id to articol_id
ALTER TABLE public.products RENAME COLUMN article_id TO articol_id;

-- Recreate unique constraint and index with new column name
ALTER TABLE public.products ADD CONSTRAINT products_articol_id_unique UNIQUE (articol_id);

-- Recreate composite unique index with new column name
CREATE UNIQUE INDEX IF NOT EXISTS
  products_erp_product_code_articol_id_idx
ON public.products (erp_product_code, articol_id);