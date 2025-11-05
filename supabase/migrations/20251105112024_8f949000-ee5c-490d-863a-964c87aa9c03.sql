-- Create backup copy of products table
CREATE TABLE public.products_bak_bak AS 
SELECT * FROM public.products;

-- Enable RLS on the backup table
ALTER TABLE public.products_bak_bak ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the backup table
CREATE POLICY "Admins and operators can view products_bak_bak"
ON public.products_bak_bak
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert products_bak_bak"
ON public.products_bak_bak
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update products_bak_bak"
ON public.products_bak_bak
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete products_bak_bak"
ON public.products_bak_bak
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));