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

    // Skip if already processed or if it's a DELETE
    if (payload.type === "DELETE") {
      console.log("Delete operation - skipping sync");
      return new Response(
        JSON.stringify({ success: true, message: "Delete - no sync needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const record = payload.record;
    if (!record) {
      throw new Error("No record in payload");
    }

    // Only sync html/webpage resources for yli.ro or yli.hu
    if (record.resource_type !== "html" || record.resource_content !== "webpage") {
      console.log("Not a webpage resource - skipping sync");
      return new Response(
        JSON.stringify({ success: true, message: "Not a webpage - no sync needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!record.server || !["yli.ro", "yli.hu"].includes(record.server)) {
      console.log("Not yli.ro or yli.hu - skipping sync");
      return new Response(
        JSON.stringify({ success: true, message: "Not yli site - no sync needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which webhook to call based on server
    const RUN_MODE = Deno.env.get("RUN_MODE") ?? "DEVELOPMENT";
    const isProduction = RUN_MODE === "PRODUCTION";
    const site = record.server === "yli.ro" ? "ro" : "hu";

    const webhookSecretName = site === "ro"
      ? (isProduction ? "N8N_WEBHOOK_URL_RO_PRODUCTION" : "N8N_WEBHOOK_URL_RO")
      : (isProduction ? "N8N_WEBHOOK_URL_HU_PRODUCTION" : "N8N_WEBHOOK_URL_HU");

    const webhookUrl = Deno.env.get(webhookSecretName);
    
    if (!webhookUrl) {
      console.warn(`No webhook URL configured for ${webhookSecretName}`);
      return new Response(
        JSON.stringify({ success: true, message: "No webhook configured - sync skipped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the n8n webhook asynchronously
    console.log(`Calling ${site.toUpperCase()} webhook for resource sync...`);

    const syncPayload = {
      action: "resource_sync",
      resource_id: record.resource_id,
      articol_id: record.articol_id,
      erp_product_code: record.erp_product_code,
      url: record.url,
      server: record.server,
      language: record.language,
      timestamp: new Date().toISOString(),
    };

    // Use EdgeRuntime.waitUntil for background processing
    const syncPromise = fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(syncPayload),
    }).then(async (response) => {
      if (!response.ok) {
        console.error(`Webhook failed with status ${response.status}`);
      } else {
        console.log(`Webhook succeeded for resource ${record.resource_id}`);
        
        // Mark as processed
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        await supabase
          .from("products_resources")
          .update({ processed: true })
          .eq("resource_id", record.resource_id);
      }
    }).catch((error) => {
      console.error("Webhook error:", error);
    });

    // Run sync in background - don't wait for completion
    // deno-lint-ignore no-explicit-any
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(syncPromise);
    } else {
      // Fallback: start the promise but don't wait
      syncPromise.catch(console.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sync initiated",
        resource_id: record.resource_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-resource:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
