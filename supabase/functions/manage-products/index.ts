import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, unknown>;
const TABLE = "products";
const CONFLICT_KEYS = "erp_product_code,articol_id"; // composite unique constraint
const CHUNK_SIZE = 500;

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function badRequest(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serverError(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { operation, data } = await req.json();
    const rows = toArray<Row>(data);

    console.log("Received:", { operation, count: rows.length });

    if (!["insert", "update"].includes(operation)) {
      return badRequest({ error: 'Invalid operation. Must be "insert" or "update"' });
    }
    if (rows.length === 0) {
      return badRequest({ error: "data must be an object or non-empty array" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const chunks = chunk(rows, CHUNK_SIZE);
    const results: Row[] = [];
    let totalAffected = 0;

    if (operation === "insert") {
      // Batch insert (multiple rows at once supported natively)
      for (const c of chunks) {
        const { data: inserted, error, count } = await supabase.from(TABLE).insert(c, { count: "exact" }).select();

        if (error) {
          console.error("Insert error:", error);
          return serverError({ error: "Failed to insert rows", details: error.message });
        }
        results.push(...(inserted ?? []));
        totalAffected += count ?? inserted?.length ?? 0;
      }
    } else {
      // Batch update — use UPSERT on conflict keys to update each row
      // Validate required keys on all rows
      const missingKey = rows.findIndex((r) => 
        !("erp_product_code" in r) || r["erp_product_code"] == null ||
        !("articol_id" in r) || r["articol_id"] == null
      );
      if (missingKey !== -1) {
        return badRequest({
          error: `All rows for update must include "erp_product_code" and "articol_id"`,
          example: { erp_product_code: "ABC123", articol_id: 1, field_to_update: "value" },
          offendingIndex: missingKey,
        });
      }

      for (const c of chunks) {
        const {
          data: upserted,
          error,
          count,
        } = await supabase
          .from(TABLE)
          .upsert(c, { onConflict: CONFLICT_KEYS, ignoreDuplicates: false, count: "exact" })
          .select();

        if (error) {
          console.error("Upsert(Update) error:", error);
          return serverError({ error: "Failed to upsert rows", details: error.message });
        }
        results.push(...(upserted ?? []));
        totalAffected += count ?? upserted?.length ?? 0;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        rowsRequested: rows.length,
        chunkSize: CHUNK_SIZE,
        rowsAffected: totalAffected,
        data: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return serverError({ error: "Internal server error", details: msg });
  }
});
