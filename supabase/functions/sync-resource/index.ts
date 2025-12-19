import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResourcePayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    resource_id: number;
    articol_id: number | null;
    erp_product_code: string | null;
    resource_type: string;
    resource_content: string | null;
    url: string | null;
    server: string | null;
    language: string | null;
    processed: boolean | null;
  } | null;
  old_record: {
    resource_id: number;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ResourcePayload = await req.json();

    console.log(`Sync triggered: ${payload.type} on resource`, {
      resource_id: payload.record?.resource_id || payload.old_record?.resource_id,
      resource_type: payload.record?.resource_type,
      resource_content: payload.record?.resource_content,
      server: payload.record?.server,
    });

    // Skip DELETE operations for now
    if (payload.type === "DELETE") {
      console.log("Delete operation - skipping sync");
      return new Response(JSON.stringify({ success: true, message: "Delete - no sync needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = payload.record;
    if (!record) {
      throw new Error("No record in payload");
    }

    // Only sync html/webpage resources for yli.ro or yli.hu
    if (record.resource_type !== "html" || record.resource_content !== "webpage") {
      console.log("Not a webpage resource - skipping sync");
      return new Response(JSON.stringify({ success: true, message: "Not a webpage - no sync needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!record.server || !["yli.ro", "yli.hu"].includes(record.server)) {
      console.log("Not yli.ro or yli.hu - skipping sync");
      return new Response(JSON.stringify({ success: true, message: "Not yli site - no sync needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get remote database credentials
    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteServiceKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!remoteUrl || !remoteServiceKey) {
      console.error("Missing remote database credentials (SRC_SUPABASE_URL or SRC_SUPABASE_SERVICE_ROLE_KEY)");
      return new Response(JSON.stringify({ success: false, message: "Remote database not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create clients for local and remote databases
    const localSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const remoteSupabase = createClient(remoteUrl, remoteServiceKey);

    // Fetch the full resource record from local database
    const { data: fullResource, error: fetchError } = await localSupabase
      .from("products_resources")
      .select("*")
      .eq("resource_id", record.resource_id)
      .single();

    if (fetchError || !fullResource) {
      console.error("Failed to fetch full resource:", fetchError);
      throw new Error(`Failed to fetch resource ${record.resource_id}`);
    }

    console.log(`Syncing resource ${record.resource_id} to remote database...`, {
      erp_product_code: fullResource.erp_product_code,
      url: fullResource.url,
      server: fullResource.server,
    });

    // Upsert to remote database
    // We'll match on erp_product_code + language + resource_type for upsert
    const upsertData = {
      articol_id: fullResource.articol_id,
      erp_product_code: fullResource.erp_product_code,
      resource_type: fullResource.resource_type,
      resource_content: fullResource.resource_content,
      url: fullResource.url,
      server: fullResource.server,
      language: fullResource.language,
      title: fullResource.title,
      description: fullResource.description,
      content_text: fullResource.content_text,
      meta_json: fullResource.meta_json,
      resource_snapshot: fullResource.resource_snapshot,
      snapshot_at: fullResource.snapshot_at,
      url_status: fullResource.url_status,
      url_status_code: fullResource.url_status_code,
      url_error: fullResource.url_error,
      url_checked_at: fullResource.url_checked_at,
      url_check_count: fullResource.url_check_count,
      updated_at: new Date().toISOString(),
    };

    // Try to find existing record in remote by erp_product_code + language + resource_type
    const { data: existingRemote } = await remoteSupabase
      .from("products_resources")
      .select("resource_id")
      .eq("erp_product_code", fullResource.erp_product_code)
      .eq("language", fullResource.language)
      .eq("resource_type", fullResource.resource_type)
      .maybeSingle();

    let syncResult;
    if (existingRemote) {
      // Update existing record
      console.log(`Updating existing remote resource ${existingRemote.resource_id}`);
      const { error: updateError } = await remoteSupabase
        .from("products_resources")
        .update(upsertData)
        .eq("resource_id", existingRemote.resource_id);

      if (updateError) {
        console.error("Remote update failed:", updateError);
        throw new Error(`Remote update failed: ${updateError.message}`);
      }
      syncResult = { action: "updated", remote_resource_id: existingRemote.resource_id };
    } else {
      // Insert new record
      console.log("Inserting new remote resource");
      const { data: insertedData, error: insertError } = await remoteSupabase
        .from("products_resources")
        .insert({
          resource_id: fullResource.resource_id, // ADD THIS LINE
          ...upsertData,
          created_at: new Date().toISOString(),
        })
        .select("resource_id")
        .single();

      if (insertError) {
        console.error("Remote insert failed:", insertError);
        throw new Error(`Remote insert failed: ${insertError.message}`);
      }
      syncResult = { action: "inserted", remote_resource_id: insertedData?.resource_id };
    }

    console.log(`Sync completed successfully:`, syncResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync completed",
        ...syncResult,
        local_resource_id: record.resource_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in sync-resource:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
