import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { TriggerSnapshotRequest, TriggerSnapshotResponse } from "../_shared/schema.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const parsed = TriggerSnapshotRequest.safeParse(body);
    if (!parsed.success) {
      return json({ success: false, error: parsed.error.message }, 400);
    }

    const { productCode, siteUrl, productDescription, productId, site: siteIn } = parsed.data;
    const host = new URL(siteUrl).hostname;
    const site = siteIn ?? (host.includes("yli.ro") ? "ro" : host.includes("yli.hu") ? "hu" : null);
    if (!site) return json({ success: false, error: "Cannot infer site" }, 400);

    // Determine if running in production or dev mode
    const RUN_MODE = Deno.env.get("RUN_MODE") ?? "DEVELOPMENT";
    const isProduction = RUN_MODE === "PRODUCTION";
    
    // Call your n8n webhook
    const webhookUrl = site === "ro"
      ? isProduction
        ? Deno.env.get("N8N_WEBHOOK_URL_RO_PRODUCTION")
        : Deno.env.get("N8N_WEBHOOK_URL_RO")
      : isProduction
        ? Deno.env.get("N8N_WEBHOOK_URL_HU_PRODUCTION")
        : Deno.env.get("N8N_WEBHOOK_URL_HU")
   

    const n8nRes = await fetch(webhookUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode, url: siteUrl, productDescription, productId})
    });

    if (!n8nRes.ok) throw new Error(`n8n failed ${n8nRes.status}`);
    const n8nData = await n8nRes.json();

    const imageBase64 = n8nData.imageBase64;
    if (!imageBase64) throw new Error("Missing imageBase64 from n8n");

    /*const yliroDescriere = n8nData.productDescription || null;
    const productDescription = n8nData.productDescription || null;*/

    const updateField =
      site === "ro"
        ? { 
            site_ro_snapshot_base64: imageBase64, 
            yliro_sku: productCode,
            yliro_descriere: productDescription,
            yliro_product_id: productId
          }
        : { 
            site_hu_snapshot_base64: imageBase64, 
            ylihu_sku: productCode,
            ylihu_descriere: productDescription,
            ylihu_product_id: productId
          };

    await supabase.from("products").update(updateField).eq("erp_product_code", productCode);

    const resp: TriggerSnapshotResponse = {
      success: true,
      site,
      imageBase64,
      mimeType: n8nData.mimeType ?? "image/jpeg",
      updatedFields: Object.keys(updateField).reduce((acc, k) => ({ ...acc, [k]: true }), {}),
      message: `Snapshot stored for ${site}`
    };
    return json(resp);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: errorMessage }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
