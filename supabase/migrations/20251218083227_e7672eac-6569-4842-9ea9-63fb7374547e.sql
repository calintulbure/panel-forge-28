-- Add tip_produs fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tip_produs_id_sub integer,
ADD COLUMN IF NOT EXISTS tip_produs_id_main integer;