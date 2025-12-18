-- Enable RLS on backup table
ALTER TABLE public.products_bak_202512181100 ENABLE ROW LEVEL SECURITY;

-- Add same policies as other backup tables
CREATE POLICY "Admins and operators can view products_bak_202512181100" 
ON public.products_bak_202512181100 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert products_bak_202512181100" 
ON public.products_bak_202512181100 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update products_bak_202512181100" 
ON public.products_bak_202512181100 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete products_bak_202512181100" 
ON public.products_bak_202512181100 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));