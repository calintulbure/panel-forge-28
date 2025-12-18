-- Change ro_stock from integer to numeric (float)
ALTER TABLE public.products 
ALTER COLUMN ro_stock TYPE numeric USING ro_stock::numeric;

-- Change hu_stock from integer to numeric (float)
ALTER TABLE public.products 
ALTER COLUMN hu_stock TYPE numeric USING hu_stock::numeric;