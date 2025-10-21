-- Create unique composite index to enable duplicate detection
-- Note: CONCURRENTLY cannot be used in transaction blocks (migrations)
CREATE UNIQUE INDEX IF NOT EXISTS
  products_erp_product_code_article_id_idx
ON public.products (erp_product_code, article_id);