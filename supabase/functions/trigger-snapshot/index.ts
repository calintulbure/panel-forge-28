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

    // Validate that the URL looks like a product page (must end with .html)
    // This prevents category pages like /newproducts from being sent to n8n
    try {
      const parsedUrl = new URL(siteUrl);
      const pathname = parsedUrl.pathname.toLowerCase();
      
      // Must be a .html page (product pages on yli.ro/yli.hu end with .html)
      if (!pathname.endsWith('.html')) {
        throw new Error(`Invalid product URL: "${siteUrl}" does not appear to be a product page. Product URLs must end with .html`);
      }
      
      // Reject known category/listing pages
      const invalidPaths = ['/newproducts', '/category', '/search', '/catalog', '/index'];
      for (const invalid of invalidPaths) {
        if (pathname.includes(invalid)) {
          throw new Error(`Invalid product URL: "${siteUrl}" appears to be a category or listing page, not a product page`);
        }
      }
    } catch (urlError) {
      if (urlError instanceof Error && urlError.message.startsWith('Invalid product URL')) {
        throw urlError;
      }
      throw new Error(`Invalid URL format: ${siteUrl}`);
    }

    console.log(`Triggering snapshot capture for ${site.toUpperCase()} site:`, { productCode, siteUrl, });

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
      productDescription:n8nData.productDescription,
      productId:n8nData.productId,
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

    // First get the articol_id from products table
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("articol_id")
      .eq("erp_product_code", productCode)
      .single();

    if (productError || !productData) {
      console.error("Failed to find product:", productError);
      throw new Error(`Product not found: ${productCode}`);
    }

    // Prepare product update fields (SKU, description, product_id - but NOT snapshot)
    const productUpdateFields =
      site === "ro"
        ? {
            yliro_sku: n8nData.productCode,
            yliro_descriere: n8nData.productDescription,
            site_ro_product_id: n8nData.productId
          }
        : {
            ylihu_sku: n8nData.productCode,
            ylihu_descriere: n8nData.productDescription,
            site_hu_product_id: n8nData.productId
          };

    // Update product table (without snapshot)
    const { error: productUpdateError } = await supabase
      .from("products")
      .update(productUpdateFields)
      .eq("erp_product_code", productCode);

    if (productUpdateError) {
      console.error("Failed to update product:", productUpdateError);
      throw new Error(`Product update failed: ${productUpdateError.message}`);
    }

    // Update resource snapshot via remote-resources edge function (writes to REMOTE, which syncs back to local)
    // This ensures consistent resource_id generation from the remote database
    const serverDomain = new URL(siteUrl).hostname.replace(/^www\./, '');
    const localUrl = Deno.env.get("SUPABASE_URL") ?? "";
    
    const remoteResourcesResponse = await fetch(`${localUrl}/functions/v1/remote-resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: "upsert",
        record: {
          articol_id: productData.articol_id,
          erp_product_code: productCode,
          resource_type: "html",
          resource_content: "webpage",
          language: site,
          url: siteUrl,
          server: serverDomain,
          resource_snapshot: n8nData.imageBase64,
          snapshot_at: new Date().toISOString(),
          processed: false,
        },
        match_on: {
          erp_product_code: productCode,
          language: site,
          resource_type: "html",
        }
      }),
    });

    if (!remoteResourcesResponse.ok) {
      const errorText = await remoteResourcesResponse.text();
      console.error("Failed to update remote resource:", errorText);
      throw new Error(`Remote resource update failed: ${errorText}`);
    }

    const resourceResult = await remoteResourcesResponse.json();
    if (!resourceResult.success) {
      throw new Error(`Remote resource update failed: ${resourceResult.error}`);
    }

    console.log(`Successfully updated ${site.toUpperCase()} snapshot via remote-resources (${resourceResult.action}) and product fields:`, Object.keys(productUpdateFields));

    // Prepare response fields
    const responseFields =
      site === "ro"
        ? { resource_snapshot: true, yliro_sku: n8nData.productCode }
        : { resource_snapshot: true, ylihu_sku: n8nData.productCode };

    return new Response(
      JSON.stringify({
        success: true,
        site,
        updatedFields: responseFields,
        storedIn: "remote_products_resources",
        resource_id: resourceResult.data?.resource_id,
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
