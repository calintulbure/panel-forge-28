-- Create function to count products per product type
CREATE OR REPLACE FUNCTION public.get_product_type_counts()
RETURNS TABLE(tip_produs_id_sub integer, product_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    tip_produs_id_sub::integer,
    COUNT(*)::bigint as product_count
  FROM products
  WHERE tip_produs_id_sub IS NOT NULL
  GROUP BY tip_produs_id_sub;
$$;