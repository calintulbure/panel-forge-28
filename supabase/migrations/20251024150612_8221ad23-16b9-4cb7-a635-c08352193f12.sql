-- Drop the existing primary key on erp_product_code
ALTER TABLE public.products DROP CONSTRAINT products_pkey;

-- Drop the unique constraint on articol_id (this will also drop the associated index)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_articol_id_unique;

-- Drop any remaining indexes on articol_id
DROP INDEX IF EXISTS public.idx_products_article_id;

-- Add primary key on articol_id
ALTER TABLE public.products ADD PRIMARY KEY (articol_id);

-- Keep erp_product_code as unique since it's still important
CREATE UNIQUE INDEX IF NOT EXISTS products_erp_product_code_unique 
  ON public.products(erp_product_code);