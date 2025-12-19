-- Create products_resources table
CREATE TABLE public.products_resources (
  resource_id SERIAL NOT NULL,
  articol_id INTEGER NULL,
  erp_product_code TEXT NULL,
  resource_type TEXT NOT NULL,
  resource_content TEXT NULL,
  url TEXT NULL,
  server TEXT NULL,
  content_text TEXT NULL,
  language VARCHAR(10) NULL,
  title TEXT NULL,
  description TEXT NULL,
  meta_json JSONB NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  url_status TEXT NULL DEFAULT 'unchecked'::text,
  url_status_code INTEGER NULL,
  url_checked_at TIMESTAMP WITH TIME ZONE NULL,
  url_error TEXT NULL,
  url_check_count INTEGER NULL DEFAULT 0,
  
  CONSTRAINT products_resources_pkey PRIMARY KEY (resource_id),
  CONSTRAINT products_resources_articol_url_unique UNIQUE (articol_id, url),
  CONSTRAINT products_resources_content_check CHECK (
    resource_content IS NULL OR resource_content = ANY (ARRAY[
      'datasheet', 'manual', 'certificate', 'quickstart', 'brochure',
      'software', 'specs', 'application', 'image', 'webpage', 'other'
    ])
  ),
  CONSTRAINT products_resources_type_check CHECK (
    resource_type = ANY (ARRAY['erp', 'html', 'file_url', 'text'])
  ),
  CONSTRAINT products_resources_url_status_check CHECK (
    url_status = ANY (ARRAY[
      'unchecked', 'reachable', 'unreachable', 'redirect', 'timeout', 'error'
    ])
  )
);

-- Create indexes
CREATE INDEX idx_products_resources_articol ON public.products_resources USING btree (articol_id);
CREATE INDEX idx_products_resources_erp_code ON public.products_resources USING btree (erp_product_code);
CREATE INDEX idx_products_resources_server ON public.products_resources USING btree (server);
CREATE INDEX idx_products_resources_type ON public.products_resources USING btree (resource_type);
CREATE INDEX idx_products_resources_url_unchecked ON public.products_resources USING btree (resource_id) WHERE url IS NOT NULL AND url_status = 'unchecked';
CREATE INDEX idx_products_resources_processed ON public.products_resources USING btree (processed) WHERE NOT processed;
CREATE INDEX idx_products_resources_url_status ON public.products_resources USING btree (url_status) WHERE url IS NOT NULL;

-- Enable RLS
ALTER TABLE public.products_resources ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as products table)
CREATE POLICY "Admins and operators can view products_resources"
ON public.products_resources FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins and operators can insert products_resources"
ON public.products_resources FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins and operators can update products_resources"
ON public.products_resources FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins can delete products_resources"
ON public.products_resources FOR DELETE
USING (has_role(auth.uid(), 'admin'));