-- Fix notify_resource_change trigger to use pg_net schema (net.http_post)

-- Ensure pg_net extension is installed
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Recreate function with correct pg_net call signature
CREATE OR REPLACE FUNCTION public.notify_resource_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  payload jsonb;
  service_role_key text;
BEGIN
  service_role_key := current_setting('app.settings.service_role_key', true);

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
  IF TG_OP != 'DELETE'
     AND NEW.resource_type = 'html'
     AND NEW.resource_content = 'webpage'
     AND (NEW.processed IS NULL OR NEW.processed = false)
     AND NEW.server IN ('yli.ro', 'yli.hu') THEN

    PERFORM net.http_post(
      url := 'https://vmijvdxllubdudppeemr.supabase.co/functions/v1/sync-resource',
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      timeout_milliseconds := 10000
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure trigger includes DELETE too (matches function logic)
DROP TRIGGER IF EXISTS on_resource_change ON public.products_resources;

CREATE TRIGGER on_resource_change
  AFTER INSERT OR UPDATE OR DELETE ON public.products_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_resource_change();
