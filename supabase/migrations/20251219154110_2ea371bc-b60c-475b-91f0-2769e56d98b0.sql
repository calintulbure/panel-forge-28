-- Create trigger function to sync changes to remote
CREATE OR REPLACE FUNCTION public.sync_resource_to_remote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
DECLARE
  payload jsonb;
  service_role_key text;
BEGIN
  -- Get the service role key from vault or env
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If not available, try to get from request headers (for API calls)
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := nullif(current_setting('request.header.authorization', true), '');
    IF service_role_key IS NULL THEN
      service_role_key := (nullif(current_setting('request.headers', true), '')::jsonb ->> 'authorization');
    END IF;
  END IF;

  -- Build the payload based on operation type
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'old_record', jsonb_build_object('resource_id', OLD.resource_id)
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', to_jsonb(NEW),
      'old_record', jsonb_build_object('resource_id', OLD.resource_id)
    );
  END IF;

  -- Only call the edge function if we have authorization
  IF service_role_key IS NOT NULL AND service_role_key != '' THEN
    PERFORM net.http_post(
      url := 'https://vmijvdxllubdudppeemr.supabase.co/functions/v1/sync-resource-to-remote',
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', service_role_key
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
$function$;

-- Create the trigger on products_resources table
DROP TRIGGER IF EXISTS sync_resource_to_remote_trigger ON public.products_resources;

CREATE TRIGGER sync_resource_to_remote_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.products_resources
FOR EACH ROW
EXECUTE FUNCTION public.sync_resource_to_remote();