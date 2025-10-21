-- Add unique constraint and index on article_id
ALTER TABLE public.products ADD CONSTRAINT products_article_id_unique UNIQUE (article_id);
CREATE INDEX IF NOT EXISTS idx_products_article_id ON public.products(article_id);

-- Add new columns
ALTER TABLE public.products ADD COLUMN senior_erp_link VARCHAR(250);
ALTER TABLE public.products ADD COLUMN producator VARCHAR(150);