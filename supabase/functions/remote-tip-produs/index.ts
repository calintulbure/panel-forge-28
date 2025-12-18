import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const srcUrl = Deno.env.get("SRC_SUPABASE_URL");
    const srcKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!srcUrl || !srcKey) {
      return json({ error: "Remote database not configured" }, 500);
    }

    const srcClient = createClient(srcUrl, srcKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    console.log(`[remote-tip-produs] Action: ${action}, Method: ${req.method}`);

    // GET: List tip_produs entries
    if (req.method === "GET") {
      const search = url.searchParams.get("search") || "";
      const limit = parseInt(url.searchParams.get("limit") || "200");
      const level = url.searchParams.get("level") || ""; // "main", "sub", or "" for all
      const mainId = url.searchParams.get("mainId") || "";

      let query = srcClient
        .from("tip_produs")
        .select("tipprodus_id, tipprodus_cod, tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr, countproduse")
        .order("tipprodus_descriere", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.ilike("tipprodus_descriere", `%${search}%`);
      }

      if (level) {
        // Case-insensitive match for level (database has "Main"/"Sub", UI sends "main"/"sub")
        query = query.ilike("tipprodus_level", level);
      }

      if (mainId) {
        query = query.eq("tipprodusmain_id", parseInt(mainId));
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching tip_produs:", error);
        return json({ error: error.message }, 500);
      }

      console.log(`[remote-tip-produs] Found ${data?.length || 0} entries`);
      return json({ data });
    }

    // POST: Create new tip_produs or update product's tip_produs_id
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "create-type") {
        // Create new tip_produs
        const { tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr } = body;
        
        if (!tipprodus_descriere || typeof tipprodus_descriere !== "string" || tipprodus_descriere.trim().length === 0) {
          return json({ error: "tipprodus_descriere is required" }, 400);
        }

        // Get max id to generate new one
        const { data: maxData } = await srcClient
          .from("tip_produs")
          .select("tipprodus_id")
          .order("tipprodus_id", { ascending: false })
          .limit(1);

        const newId = (maxData?.[0]?.tipprodus_id || 0) + 1;
        const tipprodus_cod = `TP${newId.toString().padStart(4, '0')}`;

        const insertData: Record<string, unknown> = {
          tipprodus_id: newId,
          tipprodus_cod,
          tipprodus_descriere: tipprodus_descriere.trim(),
          tipprodus_level: tipprodus_level || "main",
          countproduse: 0,
        };

        if (tipprodus_level === "sub" && tipprodusmain_id) {
          insertData.tipprodusmain_id = tipprodusmain_id;
          insertData.tipprodusmain_descr = tipprodusmain_descr || null;
        }

        const { data, error } = await srcClient
          .from("tip_produs")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error("Error creating tip_produs:", error);
          return json({ error: error.message }, 500);
        }

        console.log(`[remote-tip-produs] Created new type: ${data.tipprodus_id} - ${data.tipprodus_descriere}`);
        return json({ data });
      }

      if (action === "update-product") {
        // Update product's tip_produs_id_sub
        const { erp_product_code, tip_produs_id_sub } = body;
        if (!erp_product_code) {
          return json({ error: "erp_product_code is required" }, 400);
        }

        const { data, error } = await srcClient
          .from("products")
          .update({ tip_produs_id_sub })
          .eq("erp_product_code", erp_product_code)
          .select("erp_product_code, tip_produs_id_sub")
          .single();

        if (error) {
          console.error("Error updating product:", error);
          return json({ error: error.message }, 500);
        }

        console.log(`[remote-tip-produs] Updated product ${erp_product_code} with tip_produs_id_sub: ${tip_produs_id_sub}`);
        return json({ data });
      }

      return json({ error: "Invalid action" }, 400);
    }

    // PUT: Update existing tip_produs
    if (req.method === "PUT") {
      const body = await req.json();
      const { tipprodus_id, tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr } = body;

      if (!tipprodus_id) {
        return json({ error: "tipprodus_id is required" }, 400);
      }

      const updateData: Record<string, unknown> = {};
      
      if (tipprodus_descriere !== undefined) {
        updateData.tipprodus_descriere = tipprodus_descriere.trim();
      }
      if (tipprodus_level !== undefined) {
        updateData.tipprodus_level = tipprodus_level;
      }
      if (tipprodusmain_id !== undefined) {
        updateData.tipprodusmain_id = tipprodusmain_id;
      }
      if (tipprodusmain_descr !== undefined) {
        updateData.tipprodusmain_descr = tipprodusmain_descr;
      }

      const { data, error } = await srcClient
        .from("tip_produs")
        .update(updateData)
        .eq("tipprodus_id", tipprodus_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating tip_produs:", error);
        return json({ error: error.message }, 500);
      }

      console.log(`[remote-tip-produs] Updated type: ${data.tipprodus_id} - ${data.tipprodus_descriere}`);
      return json({ data });
    }

    // DELETE: Delete tip_produs
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return json({ error: "id is required" }, 400);
      }

      const { error } = await srcClient
        .from("tip_produs")
        .delete()
        .eq("tipprodus_id", parseInt(id));

      if (error) {
        console.error("Error deleting tip_produs:", error);
        return json({ error: error.message }, 500);
      }

      console.log(`[remote-tip-produs] Deleted type: ${id}`);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
