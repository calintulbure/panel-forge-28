import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, record, old_record } = body;

    console.log(`[sync-resource-to-remote] Received ${type} event`);

    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteServiceKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!remoteUrl || !remoteServiceKey) {
      throw new Error("Missing remote database credentials");
    }

    const remoteSupabase = createClient(remoteUrl, remoteServiceKey);

    if (type === "DELETE") {
      // Delete from remote by resource_id
      const resourceId = old_record?.resource_id;
      if (!resourceId) {
        console.log("[DELETE] No resource_id in old_record, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "no resource_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[DELETE] Deleting resource_id=${resourceId} from remote`);
      const { error } = await remoteSupabase
        .from("products_resources")
        .delete()
        .eq("resource_id", resourceId);

      if (error) {
        console.error(`[DELETE] Error:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[DELETE] Successfully deleted resource_id=${resourceId} from remote`);
      return new Response(JSON.stringify({ success: true, action: "deleted", resource_id: resourceId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "INSERT") {
      // Insert to remote
      if (!record?.resource_id || !record?.articol_id || !record?.url) {
        console.log("[INSERT] Missing required fields, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "missing required fields" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[INSERT] Inserting resource_id=${record.resource_id} to remote`);
      
      // Check if already exists
      const { data: existing } = await remoteSupabase
        .from("products_resources")
        .select("resource_id")
        .eq("resource_id", record.resource_id)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[INSERT] resource_id=${record.resource_id} already exists on remote, skipping`);
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await remoteSupabase.from("products_resources").insert({
        resource_id: record.resource_id,
        articol_id: record.articol_id,
        erp_product_code: record.erp_product_code,
        resource_type: record.resource_type,
        resource_content: record.resource_content,
        url: record.url,
        server: record.server,
        language: record.language,
        title: record.title,
        description: record.description,
        content_text: record.content_text,
        meta_json: record.meta_json,
        resource_snapshot: record.resource_snapshot,
        snapshot_at: record.snapshot_at,
        url_status: record.url_status,
        url_status_code: record.url_status_code,
        url_error: record.url_error,
        url_checked_at: record.url_checked_at,
        url_check_count: record.url_check_count,
        processed: record.processed,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });

      if (error) {
        console.error(`[INSERT] Error:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[INSERT] Successfully inserted resource_id=${record.resource_id} to remote`);
      return new Response(JSON.stringify({ success: true, action: "inserted", resource_id: record.resource_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "UPDATE") {
      // Update on remote
      if (!record?.resource_id) {
        console.log("[UPDATE] No resource_id, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "no resource_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[UPDATE] Updating resource_id=${record.resource_id} on remote`);

      // Check if exists on remote
      const { data: existing } = await remoteSupabase
        .from("products_resources")
        .select("resource_id")
        .eq("resource_id", record.resource_id)
        .limit(1);

      if (!existing || existing.length === 0) {
        // Doesn't exist on remote, insert instead
        console.log(`[UPDATE] resource_id=${record.resource_id} not found on remote, inserting instead`);
        const { error } = await remoteSupabase.from("products_resources").insert({
          resource_id: record.resource_id,
          articol_id: record.articol_id,
          erp_product_code: record.erp_product_code,
          resource_type: record.resource_type,
          resource_content: record.resource_content,
          url: record.url,
          server: record.server,
          language: record.language,
          title: record.title,
          description: record.description,
          content_text: record.content_text,
          meta_json: record.meta_json,
          resource_snapshot: record.resource_snapshot,
          snapshot_at: record.snapshot_at,
          url_status: record.url_status,
          url_status_code: record.url_status_code,
          url_error: record.url_error,
          url_checked_at: record.url_checked_at,
          url_check_count: record.url_check_count,
          processed: record.processed,
          created_at: record.created_at,
          updated_at: record.updated_at,
        });

        if (error) {
          console.error(`[UPDATE->INSERT] Error:`, error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, action: "inserted", resource_id: record.resource_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update existing record
      const { error } = await remoteSupabase
        .from("products_resources")
        .update({
          articol_id: record.articol_id,
          erp_product_code: record.erp_product_code,
          resource_type: record.resource_type,
          resource_content: record.resource_content,
          url: record.url,
          server: record.server,
          language: record.language,
          title: record.title,
          description: record.description,
          content_text: record.content_text,
          meta_json: record.meta_json,
          resource_snapshot: record.resource_snapshot,
          snapshot_at: record.snapshot_at,
          url_status: record.url_status,
          url_status_code: record.url_status_code,
          url_error: record.url_error,
          url_checked_at: record.url_checked_at,
          url_check_count: record.url_check_count,
          processed: record.processed,
          updated_at: record.updated_at,
        })
        .eq("resource_id", record.resource_id);

      if (error) {
        console.error(`[UPDATE] Error:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[UPDATE] Successfully updated resource_id=${record.resource_id} on remote`);
      return new Response(JSON.stringify({ success: true, action: "updated", resource_id: record.resource_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, action: "ignored", type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sync-resource-to-remote] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
