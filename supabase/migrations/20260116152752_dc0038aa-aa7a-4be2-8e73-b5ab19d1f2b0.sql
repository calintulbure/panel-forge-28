-- Add resource_count column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS resource_count integer DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_resource_count ON public.products (resource_count);