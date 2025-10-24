-- Enable RLS on backup table for security compliance
ALTER TABLE products_bak ENABLE ROW LEVEL SECURITY;

-- Add the same RLS policies as the products table
CREATE POLICY "Admins and operators can view products_bak"
ON products_bak FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert products_bak"
ON products_bak FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update products_bak"
ON products_bak FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete products_bak"
ON products_bak FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));