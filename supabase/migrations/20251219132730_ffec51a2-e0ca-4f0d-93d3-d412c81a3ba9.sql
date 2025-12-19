-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call sync-resource edge function
CREATE OR REPLACE FUNCTION public.notify_resource_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL from environment (set via vault or config)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Build payload based on operation type
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', null,
      'old_record', jsonb_build_object('resource_id', OLD.resource_id)
    );
  ELSE
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', jsonb_build_object(
        'resource_id', NEW.resource_id,
        'articol_id', NEW.articol_id,
        'erp_product_code', NEW.erp_product_code,
        'resource_type', NEW.resource_type,
        'resource_content', NEW.resource_content,
        'url', NEW.url,
        'server', NEW.server,
        'language', NEW.language,
        'processed', NEW.processed
      ),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('resource_id', OLD.resource_id) ELSE null END
    );
  END IF;

  -- Only trigger sync for html/webpage resources that aren't processed yet
  IF TG_OP != 'DELETE' AND 
     NEW.resource_type = 'html' AND 
     NEW.resource_content = 'webpage' AND 
     (NEW.processed IS NULL OR NEW.processed = false) AND
     NEW.server IN ('yli.ro', 'yli.hu') THEN
    
    -- Make async HTTP call using pg_net
    PERFORM extensions.http_post(
      url := 'https://vmijvdxllubdudppeemr.supabase.co/functions/v1/sync-resource',
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on products_resources table
DROP TRIGGER IF EXISTS on_resource_change ON public.products_resources;

CREATE TRIGGER on_resource_change
  AFTER INSERT OR UPDATE ON public.products_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_resource_change();