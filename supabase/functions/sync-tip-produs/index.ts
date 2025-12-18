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
    // Local (destination) Supabase
    const localUrl = Deno.env.get("SUPABASE_URL");
    const localKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Remote (source) Supabase
    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!localUrl || !localKey) {
      return json({ error: "Local database not configured" }, 500);
    }
    if (!remoteUrl || !remoteKey) {
      return json({ error: "Remote database not configured" }, 500);
    }

    const localClient = createClient(localUrl, localKey);
    const remoteClient = createClient(remoteUrl, remoteKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "import";

    console.log(`[sync-tip-produs] Action: ${action}, Method: ${req.method}`);

    // POST action=import: Import all from remote to local (one-time)
    if (req.method === "POST" && action === "import") {
      // Fetch all from remote
      const { data: remoteData, error: fetchError } = await remoteClient
        .from("tip_produs")
        .select("tipprodus_id, tipprodus_cod, tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr, countproduse")
        .order("tipprodus_id", { ascending: true });

      if (fetchError) {
        console.error("Error fetching from remote:", fetchError);
        return json({ error: fetchError.message }, 500);
      }

      console.log(`[sync-tip-produs] Fetched ${remoteData?.length || 0} types from remote`);

      if (!remoteData || remoteData.length === 0) {
        return json({ imported: 0, message: "No data to import" });
      }

      // Transform data to match local schema
      const localData = remoteData.map(row => ({
        tipprodus_id: row.tipprodus_id,
        tipprodus_descriere: row.tipprodus_descriere,
        tipprodus_level: row.tipprodus_level,
        tipprodusmain_id: row.tipprodusmain_id,
      }));

      // Upsert to local, ignoring conflicts
      const { error: upsertError } = await localClient
        .from("tip_produs")
        .upsert(localData, { onConflict: "tipprodus_id" });

      if (upsertError) {
        console.error("Error upserting to local:", upsertError);
        return json({ error: upsertError.message }, 500);
      }

      console.log(`[sync-tip-produs] Imported ${localData.length} types to local`);
      return json({ imported: localData.length, success: true });
    }

    // POST action=sync-create: Create in both local and remote
    if (req.method === "POST" && action === "sync-create") {
      const body = await req.json();
      const { tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr } = body;

      if (!tipprodus_descriere || typeof tipprodus_descriere !== "string" || tipprodus_descriere.trim().length === 0) {
        return json({ error: "tipprodus_descriere is required" }, 400);
      }

      // Get max id from remote to generate new one
      const { data: maxData } = await remoteClient
        .from("tip_produs")
        .select("tipprodus_id")
        .order("tipprodus_id", { ascending: false })
        .limit(1);

      const newId = (maxData?.[0]?.tipprodus_id || 0) + 1;
      const tipprodus_cod = `TP${newId.toString().padStart(4, '0')}`;

      // Insert into remote first
      const remoteInsertData: Record<string, unknown> = {
        tipprodus_id: newId,
        tipprodus_cod,
        tipprodus_descriere: tipprodus_descriere.trim(),
        tipprodus_level: tipprodus_level || "Main",
        countproduse: 0,
      };

      if (tipprodus_level?.toLowerCase() === "sub" && tipprodusmain_id) {
        remoteInsertData.tipprodusmain_id = tipprodusmain_id;
        remoteInsertData.tipprodusmain_descr = tipprodusmain_descr || null;
      }

      const { data: remoteResult, error: remoteError } = await remoteClient
        .from("tip_produs")
        .insert(remoteInsertData)
        .select()
        .single();

      if (remoteError) {
        console.error("Error creating in remote:", remoteError);
        return json({ error: remoteError.message }, 500);
      }

      // Insert into local
      const localInsertData = {
        tipprodus_id: newId,
        tipprodus_descriere: tipprodus_descriere.trim(),
        tipprodus_level: tipprodus_level || "Main",
        tipprodusmain_id: tipprodusmain_id || null,
      };

      const { error: localError } = await localClient
        .from("tip_produs")
        .insert(localInsertData);

      if (localError) {
        console.error("Error creating in local (remote succeeded):", localError);
        // Still return success since remote was updated
      }

      console.log(`[sync-tip-produs] Created type: ${newId} - ${tipprodus_descriere}`);
      return json({ data: remoteResult });
    }

    // PUT action=sync-update: Update in both local and remote
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

      // Update remote first
      const remoteUpdateData = { ...updateData };
      if (tipprodusmain_descr !== undefined) {
        remoteUpdateData.tipprodusmain_descr = tipprodusmain_descr;
      }

      const { data: remoteResult, error: remoteError } = await remoteClient
        .from("tip_produs")
        .update(remoteUpdateData)
        .eq("tipprodus_id", tipprodus_id)
        .select()
        .single();

      if (remoteError) {
        console.error("Error updating remote:", remoteError);
        return json({ error: remoteError.message }, 500);
      }

      // Update local
      const { error: localError } = await localClient
        .from("tip_produs")
        .update(updateData)
        .eq("tipprodus_id", tipprodus_id);

      if (localError) {
        console.error("Error updating local (remote succeeded):", localError);
      }

      console.log(`[sync-tip-produs] Updated type: ${tipprodus_id}`);
      return json({ data: remoteResult });
    }

    // DELETE: Delete from both local and remote
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return json({ error: "id is required" }, 400);
      }

      const tipprodus_id = parseInt(id);

      // Delete from remote first
      const { error: remoteError } = await remoteClient
        .from("tip_produs")
        .delete()
        .eq("tipprodus_id", tipprodus_id);

      if (remoteError) {
        console.error("Error deleting from remote:", remoteError);
        return json({ error: remoteError.message }, 500);
      }

      // Delete from local
      const { error: localError } = await localClient
        .from("tip_produs")
        .delete()
        .eq("tipprodus_id", tipprodus_id);

      if (localError) {
        console.error("Error deleting from local (remote succeeded):", localError);
      }

      console.log(`[sync-tip-produs] Deleted type: ${tipprodus_id}`);
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
