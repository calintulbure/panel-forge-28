import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { BulkUpsertRequest, BulkUpsertResponse } from "../_shared/schema.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const parsed = BulkUpsertRequest.safeParse(body);
    if (!parsed.success) {
      return json({ success: false, affected: 0, error: parsed.error.message }, 400);
    }

    const { payload } = parsed.data;
    const { data, error } = await supabase.rpc("bulk_upsert_products", { payload });
    if (error) throw error;

    const resp: BulkUpsertResponse = {
      success: true,
      affected: data ?? 0,
      message: `Upserted ${data ?? 0} rows`
    };
    return json(resp);
  } catch (err) {
    return json({ success: false, affected: 0, error: err.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
