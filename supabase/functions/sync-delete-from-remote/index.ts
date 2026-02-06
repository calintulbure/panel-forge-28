import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
};

interface DeletePayload {
  resource_id?: number;
  erp_product_code?: string;
  language?: string;
  resource_type?: string;
  articol_id?: number;
  server?: string;
  resource_content?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify sync token
    const syncToken = req.headers.get("x-sync-token");
    const expectedToken = Deno.env.get("REMOTE_SYNC_TOKEN");
    
    if (!syncToken || syncToken !== expectedToken) {
      console.error("Invalid or missing sync token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: DeletePayload = await req.json();
    
    console.log("Received delete sync from remote:", payload);

    // Need at least one identifier
    if (!payload.resource_id && !payload.erp_product_code) {
      throw new Error("Missing required fields: resource_id or erp_product_code required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete from local products_resources table
    let query = supabase.from("products_resources").delete();

    if (payload.resource_id) {
      query = query.eq("resource_id", payload.resource_id);
    } else {
      // Match by composite key
      if (payload.erp_product_code) {
        query = query.eq("erp_product_code", payload.erp_product_code);
      }
      if (payload.language) {
        query = query.eq("language", payload.language);
      }
      if (payload.resource_type) {
        query = query.eq("resource_type", payload.resource_type);
      }
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error("Failed to delete local resource:", deleteError);
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    console.log("Successfully deleted from local products_resources");

    // If this was a webpage resource, clear related fields in products table
    if (payload.resource_content === "webpage" && payload.articol_id && payload.server) {
      if (payload.server === "yli.ro") {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            site_ro_url: null,
            site_ro_product_id: null,
            site_ro_snapshot_base64: null,
            yliro_sku: null,
            yliro_descriere: null,
          })
          .eq("articol_id", payload.articol_id);

        if (updateError) {
          console.error("Error clearing RO product fields:", updateError);
        } else {
          console.log(`Cleared site_ro fields for articol_id=${payload.articol_id}`);
        }
      } else if (payload.server === "yli.hu") {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            site_hu_url: null,
            site_hu_product_id: null,
            site_hu_snapshot_base64: null,
            ylihu_sku: null,
            ylihu_descriere: null,
          })
          .eq("articol_id", payload.articol_id);

        if (updateError) {
          console.error("Error clearing HU product fields:", updateError);
        } else {
          console.log(`Cleared site_hu fields for articol_id=${payload.articol_id}`);
        }
      }
    }

    // Update resource counts if articol_id is provided
    if (payload.articol_id) {
      // Get remote resource count for this articol_id (need to call remote to get accurate count)
      // For simplicity, we'll just recalculate from local after delete
      const { count: totalCount } = await supabase
        .from("products_resources")
        .select("*", { count: "exact", head: true })
        .eq("articol_id", payload.articol_id);

      const { count: unprocessedCount } = await supabase
        .from("products_resources")
        .select("*", { count: "exact", head: true })
        .eq("articol_id", payload.articol_id)
        .or("processed.is.null,processed.eq.false");

      await supabase
        .from("products")
        .update({
          resource_count: totalCount || 0,
          resource_unprocessed_count: unprocessedCount || 0,
        })
        .eq("articol_id", payload.articol_id);

      console.log(`Updated resource counts for articol_id=${payload.articol_id}: total=${totalCount}, unprocessed=${unprocessedCount}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Resource deleted from local",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-delete-from-remote:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
