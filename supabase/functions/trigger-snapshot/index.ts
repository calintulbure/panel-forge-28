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
    const { productCode, siteUrl, site } = await req.json();

    if (!productCode || !siteUrl || !site) {
      throw new Error("Missing required fields: productCode, siteUrl, or site");
    }

    if (site !== "ro" && site !== "hu") {
      throw new Error('Invalid site parameter. Must be "ro" or "hu"');
    }

    console.log(`Triggering snapshot capture for ${site.toUpperCase()} site:`, { productCode, siteUrl });

    // Determine if running in production or dev mode
    const RUN_MODE = Deno.env.get("RUN_MODE") ?? "DEVELOPMENT";
    const isProduction = RUN_MODE === "PRODUCTION";

    // Get the appropriate webhook URL

    //const secretName = site === 'ro' ? 'N8N_WEBHOOK_URL_RO' : 'N8N_WEBHOOK_URL_HU';
    const secretName =
      site === "ro"
        ? isProduction
          ? "N8N_WEBHOOK_URL_RO_PRODUCTION"
          : "N8N_WEBHOOK_URL_RO"
        : isProduction
          ? "N8N_WEBHOOK_URL_HU_PRODUCTION"
          : "N8N_WEBHOOK_URL_HU";

    //const webhookUrl = site === 'ro'
    //  ? Deno.env.get('N8N_WEBHOOK_URL_RO')
    //  : Deno.env.get('N8N_WEBHOOK_URL_HU');

    // Load webhook URL from environment
    const webhookUrl = Deno.env.get(secretName);

    if (!webhookUrl) {
      throw new Error(
        `Missing webhook URL for ${site.toUpperCase()} in ${RUN_MODE} mode. Expected env variable: ${secretName}`,
      );
    }

    // Validate that the configured value is a full URL
    try {
      new URL(webhookUrl);
    } catch {
      throw new Error(
        `Invalid n8n webhook URL configured in ${secretName}. Please set a full https URL (e.g. https://your-n8n-host/webhook/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX).`,
      );
    }

    // Call n8n webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        productCode,
        url: siteUrl,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook failed with status ${n8nResponse.status}`);
    }

    const n8nData = await n8nResponse.json();
    console.log("n8n response received:", {
      hasImageBase64: !!n8nData.imageBase64,
      productCode: n8nData.productCode,
      mimeType: n8nData.mimeType,
    });

    // Validate required fields in response
    if (!n8nData.imageBase64) {
      throw new Error("n8n response missing required field: imageBase64");
    }

    // Check if productCode is an unevaluated n8n expression
    if (!n8nData.productCode || n8nData.productCode.startsWith("={{")) {
      throw new Error(
        "n8n response has invalid productCode. Check n8n workflow configuration - expressions may not be evaluating correctly.",
      );
    }

    // Validate and normalize mimeType
    let validMimeType = n8nData.mimeType;

    // Check if mimeType is an unevaluated n8n expression or invalid
    if (!validMimeType || validMimeType.startsWith("={{") || !validMimeType.startsWith("image/")) {
      console.warn(
        `Invalid mimeType received: ${validMimeType}. Defaulting to image/jpeg. Check n8n workflow configuration.`,
      );
      validMimeType = "image/jpeg";
    }

    // Update the product with base64 data and SKU
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Prepare update fields based on site
    const updateFields =
      site === "ro"
        ? {
            site_ro_snapshot_base64: n8nData.imageBase64,
            yliro_sku: n8nData.productCode,
          }
        : {
            site_hu_snapshot_base64: n8nData.imageBase64,
            ylihu_sku: n8nData.productCode,
          };

    const { error: updateError } = await supabase
      .from("products")
      .update(updateFields)
      .eq("erp_product_code", productCode);

    if (updateError) {
      console.error("Failed to update product:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log(`Successfully updated ${site.toUpperCase()} fields:`, Object.keys(updateFields));

    // Prepare response fields
    const responseFields =
      site === "ro"
        ? { site_ro_snapshot_base64: true, yliro_sku: n8nData.productCode }
        : { site_hu_snapshot_base64: true, ylihu_sku: n8nData.productCode };

    return new Response(
      JSON.stringify({
        success: true,
        site,
        updatedFields: responseFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
