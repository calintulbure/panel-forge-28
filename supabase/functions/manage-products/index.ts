import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLE = "products";
const PK = "erp_product_code";
const CHUNK_SIZE = 500;
const VERSION = "manage-products@2025-10-21-v2";

type Row = Record<string, unknown>;

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data } = await req.json();
    
    console.log(`Received: { operation: "${operation}", count: ${toArray(data).length} }`);

    if (!["insert", "update", "upsert"].includes(operation)) {
      return json({ error: 'Invalid operation. Must be "insert", "update", or "upsert"' }, 400);
    }

    const rows = toArray<Row>(data);
    if (rows.length === 0) {
      return json({ error: "data must be an object or non-empty array" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Row[] = [];
    let processed = 0;
    let errors = 0;

    // Process in chunks
    for (const c of chunk(rows, CHUNK_SIZE)) {
      const { data: inserted, error } = await supabase
        .from(TABLE)
        .upsert(c, { 
          onConflict: PK,
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error("Batch error:", error);
        errors += c.length;
      } else {
        results.push(...(inserted ?? []));
        processed += inserted?.length ?? 0;
      }
    }

    console.log(`Processed: ${processed} records, Errors: ${errors}`);

    return json({
      success: errors === 0,
      version: VERSION,
      operation,
      summary: { 
        requested: rows.length, 
        processed, 
        errors 
      },
      data: results,
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: "Internal server error", details: msg, version: VERSION }, 500);
  }
});
