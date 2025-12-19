import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
};

interface ProcessedPayload {
  erp_product_code: string;
  language: string;
  resource_type: string;
  processed: boolean;
  title?: string;
  description?: string;
  content_text?: string;
  meta_json?: Record<string, unknown>;
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

    const payload: ProcessedPayload = await req.json();
    
    console.log("Received sync from remote:", {
      erp_product_code: payload.erp_product_code,
      language: payload.language,
      resource_type: payload.resource_type,
      processed: payload.processed,
    });

    if (!payload.erp_product_code || !payload.resource_type) {
      throw new Error("Missing required fields: erp_product_code and resource_type");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Build update data
    const updateData: Record<string, unknown> = {
      processed: payload.processed,
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.content_text !== undefined) updateData.content_text = payload.content_text;
    if (payload.meta_json !== undefined) updateData.meta_json = payload.meta_json;

    // Update local record matching erp_product_code + language + resource_type
    let query = supabase
      .from("products_resources")
      .update(updateData)
      .eq("erp_product_code", payload.erp_product_code)
      .eq("resource_type", payload.resource_type);

    // Add language filter if provided
    if (payload.language) {
      query = query.eq("language", payload.language);
    }

    const { data, error } = await query.select("resource_id");

    if (error) {
      console.error("Failed to update local resource:", error);
      throw new Error(`Update failed: ${error.message}`);
    }

    console.log("Successfully synced processed status to local:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Processed status synced",
        updated_count: data?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-processed-from-remote:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
