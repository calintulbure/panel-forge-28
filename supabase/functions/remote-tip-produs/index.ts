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
      const limit = parseInt(url.searchParams.get("limit") || "100");

      let query = srcClient
        .from("tip_produs")
        .select("id, denumire")
        .order("denumire", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.ilike("denumire", `%${search}%`);
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
        const { denumire } = body;
        if (!denumire || typeof denumire !== "string" || denumire.trim().length === 0) {
          return json({ error: "denumire is required" }, 400);
        }

        const { data, error } = await srcClient
          .from("tip_produs")
          .insert({ denumire: denumire.trim() })
          .select("id, denumire")
          .single();

        if (error) {
          console.error("Error creating tip_produs:", error);
          return json({ error: error.message }, 500);
        }

        console.log(`[remote-tip-produs] Created new type: ${data.id} - ${data.denumire}`);
        return json({ data });
      }

      if (action === "update-product") {
        // Update product's tip_produs_id
        const { erp_product_code, tip_produs_id } = body;
        if (!erp_product_code) {
          return json({ error: "erp_product_code is required" }, 400);
        }

        const { data, error } = await srcClient
          .from("products")
          .update({ tip_produs_id })
          .eq("erp_product_code", erp_product_code)
          .select("erp_product_code, tip_produs_id")
          .single();

        if (error) {
          console.error("Error updating product:", error);
          return json({ error: error.message }, 500);
        }

        console.log(`[remote-tip-produs] Updated product ${erp_product_code} with tip_produs_id: ${tip_produs_id}`);
        return json({ data });
      }

      return json({ error: "Invalid action" }, 400);
    }

    // PUT: Update existing tip_produs
    if (req.method === "PUT") {
      const body = await req.json();
      const { id, denumire } = body;

      if (!id) {
        return json({ error: "id is required" }, 400);
      }
      if (!denumire || typeof denumire !== "string" || denumire.trim().length === 0) {
        return json({ error: "denumire is required" }, 400);
      }

      const { data, error } = await srcClient
        .from("tip_produs")
        .update({ denumire: denumire.trim() })
        .eq("id", id)
        .select("id, denumire")
        .single();

      if (error) {
        console.error("Error updating tip_produs:", error);
        return json({ error: error.message }, 500);
      }

      console.log(`[remote-tip-produs] Updated type: ${data.id} - ${data.denumire}`);
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
        .eq("id", id);

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
