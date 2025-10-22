-- Create table for Hungarian products
CREATE TABLE public.yli_hu_products (
  product_id bigint NULL,
  sku text NOT NULL,
  url_key text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying NULL,
  CONSTRAINT yli_hu_products_pkey PRIMARY KEY (sku)
);

-- Create table for Romanian products
CREATE TABLE public.yli_ro_products (
  product_id bigint NULL,
  sku text NOT NULL,
  url_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying NULL,
  CONSTRAINT yli_ro_products_pkey PRIMARY KEY (sku)
);

-- Enable RLS on both tables
ALTER TABLE public.yli_hu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yli_ro_products ENABLE ROW LEVEL SECURITY;

-- Create policies for yli_hu_products
CREATE POLICY "Admins and operators can view yli_hu_products"
ON public.yli_hu_products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert yli_hu_products"
ON public.yli_hu_products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update yli_hu_products"
ON public.yli_hu_products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete yli_hu_products"
ON public.yli_hu_products
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for yli_ro_products
CREATE POLICY "Admins and operators can view yli_ro_products"
ON public.yli_ro_products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert yli_ro_products"
ON public.yli_ro_products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update yli_ro_products"
ON public.yli_ro_products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete yli_ro_products"
ON public.yli_ro_products
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));