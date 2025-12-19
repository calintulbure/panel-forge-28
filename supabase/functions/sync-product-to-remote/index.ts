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

    console.log(`[sync-product-to-remote] Received ${type} event`);

    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteServiceKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!remoteUrl || !remoteServiceKey) {
      throw new Error("Missing remote database credentials");
    }

    const remoteSupabase = createClient(remoteUrl, remoteServiceKey);

    if (type === "DELETE") {
      const articolId = old_record?.articol_id;
      if (!articolId) {
        console.log("[DELETE] No articol_id in old_record, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "no articol_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[DELETE] Deleting articol_id=${articolId} from remote`);
      const { error } = await remoteSupabase
        .from("products")
        .delete()
        .eq("articol_id", articolId);

      if (error) {
        console.error(`[DELETE] Error:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[DELETE] Successfully deleted articol_id=${articolId} from remote`);
      return new Response(JSON.stringify({ success: true, action: "deleted", articol_id: articolId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "INSERT") {
      if (!record?.articol_id || !record?.erp_product_code) {
        console.log("[INSERT] Missing required fields, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "missing required fields" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[INSERT] Inserting articol_id=${record.articol_id} to remote`);

      // Check if already exists
      const { data: existing } = await remoteSupabase
        .from("products")
        .select("articol_id")
        .eq("articol_id", record.articol_id)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[INSERT] articol_id=${record.articol_id} already exists on remote, skipping`);
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await remoteSupabase.from("products").insert({
        articol_id: record.articol_id,
        erp_product_code: record.erp_product_code,
        erp_product_description: record.erp_product_description,
        erp_product_description_detailed: record.erp_product_description_detailed,
        categ1: record.categ1,
        categ2: record.categ2,
        categ3: record.categ3,
        stare_oferta: record.stare_oferta,
        stare_oferta_secundara: record.stare_oferta_secundara,
        stare_stoc: record.stare_stoc,
        senior_erp_link: record.senior_erp_link,
        producator: record.producator,
        site_ro_product_id: record.site_ro_product_id,
        site_hu_product_id: record.site_hu_product_id,
        site_ro_url: record.site_ro_url,
        site_hu_url: record.site_hu_url,
        site_ro_snapshot_url: record.site_ro_snapshot_url,
        site_hu_snapshot_url: record.site_hu_snapshot_url,
        site_ro_snapshot_base64: record.site_ro_snapshot_base64,
        site_hu_snapshot_base64: record.site_hu_snapshot_base64,
        yliro_sku: record.yliro_sku,
        yliro_descriere: record.yliro_descriere,
        ylihu_sku: record.ylihu_sku,
        ylihu_descriere: record.ylihu_descriere,
        ro_stock: record.ro_stock,
        ro_stoc_detailed: record.ro_stoc_detailed,
        hu_stock: record.hu_stock,
        hu_stock_detailed: record.hu_stock_detailed,
        validated: record.validated,
        tosync: record.tosync,
        tip_produs_id_main: record.tip_produs_id_main,
        tip_produs_id_sub: record.tip_produs_id_sub,
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

      console.log(`[INSERT] Successfully inserted articol_id=${record.articol_id} to remote`);
      return new Response(JSON.stringify({ success: true, action: "inserted", articol_id: record.articol_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "UPDATE") {
      if (!record?.articol_id) {
        console.log("[UPDATE] No articol_id, skipping");
        return new Response(JSON.stringify({ success: true, action: "skipped", reason: "no articol_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[UPDATE] Updating articol_id=${record.articol_id} on remote`);

      // Check if exists on remote
      const { data: existing } = await remoteSupabase
        .from("products")
        .select("articol_id")
        .eq("articol_id", record.articol_id)
        .limit(1);

      if (!existing || existing.length === 0) {
        // Doesn't exist on remote, insert instead
        console.log(`[UPDATE] articol_id=${record.articol_id} not found on remote, inserting instead`);
        const { error } = await remoteSupabase.from("products").insert({
          articol_id: record.articol_id,
          erp_product_code: record.erp_product_code,
          erp_product_description: record.erp_product_description,
          erp_product_description_detailed: record.erp_product_description_detailed,
          categ1: record.categ1,
          categ2: record.categ2,
          categ3: record.categ3,
          stare_oferta: record.stare_oferta,
          stare_oferta_secundara: record.stare_oferta_secundara,
          stare_stoc: record.stare_stoc,
          senior_erp_link: record.senior_erp_link,
          producator: record.producator,
          site_ro_product_id: record.site_ro_product_id,
          site_hu_product_id: record.site_hu_product_id,
          site_ro_url: record.site_ro_url,
          site_hu_url: record.site_hu_url,
          site_ro_snapshot_url: record.site_ro_snapshot_url,
          site_hu_snapshot_url: record.site_hu_snapshot_url,
          site_ro_snapshot_base64: record.site_ro_snapshot_base64,
          site_hu_snapshot_base64: record.site_hu_snapshot_base64,
          yliro_sku: record.yliro_sku,
          yliro_descriere: record.yliro_descriere,
          ylihu_sku: record.ylihu_sku,
          ylihu_descriere: record.ylihu_descriere,
          ro_stock: record.ro_stock,
          ro_stoc_detailed: record.ro_stoc_detailed,
          hu_stock: record.hu_stock,
          hu_stock_detailed: record.hu_stock_detailed,
          validated: record.validated,
          tosync: record.tosync,
          tip_produs_id_main: record.tip_produs_id_main,
          tip_produs_id_sub: record.tip_produs_id_sub,
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

        return new Response(JSON.stringify({ success: true, action: "inserted", articol_id: record.articol_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update existing record
      const { error } = await remoteSupabase
        .from("products")
        .update({
          erp_product_code: record.erp_product_code,
          erp_product_description: record.erp_product_description,
          erp_product_description_detailed: record.erp_product_description_detailed,
          categ1: record.categ1,
          categ2: record.categ2,
          categ3: record.categ3,
          stare_oferta: record.stare_oferta,
          stare_oferta_secundara: record.stare_oferta_secundara,
          stare_stoc: record.stare_stoc,
          senior_erp_link: record.senior_erp_link,
          producator: record.producator,
          site_ro_product_id: record.site_ro_product_id,
          site_hu_product_id: record.site_hu_product_id,
          site_ro_url: record.site_ro_url,
          site_hu_url: record.site_hu_url,
          site_ro_snapshot_url: record.site_ro_snapshot_url,
          site_hu_snapshot_url: record.site_hu_snapshot_url,
          site_ro_snapshot_base64: record.site_ro_snapshot_base64,
          site_hu_snapshot_base64: record.site_hu_snapshot_base64,
          yliro_sku: record.yliro_sku,
          yliro_descriere: record.yliro_descriere,
          ylihu_sku: record.ylihu_sku,
          ylihu_descriere: record.ylihu_descriere,
          ro_stock: record.ro_stock,
          ro_stoc_detailed: record.ro_stoc_detailed,
          hu_stock: record.hu_stock,
          hu_stock_detailed: record.hu_stock_detailed,
          validated: record.validated,
          tosync: record.tosync,
          tip_produs_id_main: record.tip_produs_id_main,
          tip_produs_id_sub: record.tip_produs_id_sub,
          updated_at: record.updated_at,
        })
        .eq("articol_id", record.articol_id);

      if (error) {
        console.error(`[UPDATE] Error:`, error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[UPDATE] Successfully updated articol_id=${record.articol_id} on remote`);
      return new Response(JSON.stringify({ success: true, action: "updated", articol_id: record.articol_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, action: "ignored", type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sync-product-to-remote] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
