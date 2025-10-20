-- Add columns to store base64 screenshot data
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS site_ro_snapshot_base64 text,
ADD COLUMN IF NOT EXISTS site_hu_snapshot_base64 text;