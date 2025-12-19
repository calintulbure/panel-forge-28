-- Fix notify_resource_change to forward request Authorization header (so sync-resource verify_jwt passes)

CREATE OR REPLACE FUNCTION public.notify_resource_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  payload jsonb;
  auth_header text;
BEGIN
  -- Try to forward the Authorization header from the originating request (set by PostgREST)
  auth_header := nullif(current_setting('request.header.authorization', true), '');

  IF auth_header IS NULL THEN
    auth_header := (nullif(current_setting('request.headers', true), '')::jsonb ->> 'authorization');
  END IF;

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
     AND NEW.server IN ('yli.ro', 'yli.hu')
     AND auth_header IS NOT NULL THEN

    PERFORM net.http_post(
      url := 'https://vmijvdxllubdudppeemr.supabase.co/functions/v1/sync-resource',
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', auth_header
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
