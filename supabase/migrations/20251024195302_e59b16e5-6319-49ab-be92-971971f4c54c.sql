-- Add stare_oferta_secundara column to products table
ALTER TABLE public.products 
ADD COLUMN stare_oferta_secundara character varying;

-- Add stare_oferta_secundara column to products_bak table
ALTER TABLE public.products_bak 
ADD COLUMN stare_oferta_secundara character varying;