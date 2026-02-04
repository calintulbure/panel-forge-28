-- Add resource_unprocessed_count column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS resource_unprocessed_count integer DEFAULT 0;