import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, unknown>;

const TABLE = "products";
const PK = "erp_product_code"; // primary key in your table
const UK = "articol_id"; // unique, must never be changed once set
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const badRequest = (b: unknown) => json(b, 400);
const serverError = (b: unknown) => json(b, 500);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { operation, data } = await req.json();
    const rows = toArray<Row>(data);

    if (!["insert", "update"].includes(operation)) {
      return badRequest({ error: 'Invalid operation. Must be "insert" or "update"' });
    }
    if (rows.length === 0) {
      return badRequest({ error: "data must be an object or a non-empty array" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Collect incoming PKs and UKs (ignore null/undefined)
    const incomingPKs = Array.from(
      new Set(rows.map((r) => r[PK]).filter((v): v is string | number => v !== null && v !== undefined)),
    );
    const incomingUKs = Array.from(
      new Set(rows.map((r) => r[UK]).filter((v): v is string | number => v !== null && v !== undefined)),
    );

    // Fetch what already exists in DB
    const [existingPKRes, existingUKRes] = await Promise.all([
      incomingPKs.length
        ? supabase.from(TABLE).select(PK).in(PK, incomingPKs)
        : Promise.resolve({ data: [], error: null } as any),
      incomingUKs.length
        ? supabase.from(TABLE).select(UK).in(UK, incomingUKs)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (existingPKRes.error || existingUKRes.error) {
      return serverError({
        error: "Failed to detect existing keys",
        details: existingPKRes.error?.message || existingUKRes.error?.message,
      });
    }

    const existingPKSet = new Set((existingPKRes.data ?? []).map((r: any) => r[PK]));
    const existingUKSet = new Set((existingUKRes.data ?? []).map((r: any) => r[UK]));

    // Prepare three buckets:
    // 1) rowsToUpdate: PK exists -> upsert on PK, but NEVER send articol_id
    // 2) rowsToInsert: PK doesn't exist AND articol_id is free -> insert with articol_id
    // 3) rowsSkipped: articol_id is already taken by someone else (cannot insert)
    const rowsToUpdate: Row[] = [];
    const rowsToInsert: Row[] = [];
    const rowsSkipped: { row: Row; reason: string }[] = [];

    for (const r of rows) {
      const pk = r[PK];
      const uk = r[UK];

      const pkExists = pk !== undefined && pk !== null && existingPKSet.has(pk as any);
      const ukExists = uk !== undefined && uk !== null && existingUKSet.has(uk as any);

      if (pkExists) {
        // Existing product -> never update articol_id
        const copy: Row = { ...r };
        delete copy[UK];
        rowsToUpdate.push(copy);
      } else {
        // New product
        if (ukExists) {
          // articol_id already used by another row -> do not insert (and we never reassign articol_id)
          rowsSkipped.push({ row: r, reason: `${UK} already exists in database` });
        } else {
          rowsToInsert.push(r);
        }
      }
    }

    const results: Row[] = [];
    let insertedCount = 0;
    let updatedCount = 0;

    // 1) INSERT new rows (keep articol_id)
    if (rowsToInsert.length) {
      for (const c of chunk(rowsToInsert, CHUNK_SIZE)) {
        // Using upsert on PK with ignoreDuplicates true to be race-safe,
        // but since PK is new we expect plain insert behavior.
        const { data: ins, error } = await supabase
          .from(TABLE)
          .upsert(c, {
            onConflict: PK,
            ignoreDuplicates: true,
            count: "exact",
          })
          .select();

        if (error) {
          console.error("Insert batch error:", error);
          return serverError({ error: "Failed to insert batch", details: error.message });
        }
        results.push(...(ins ?? []));
        insertedCount += ins?.length ?? 0;
      }
    }

    // 2) UPSERT existing rows on PK (articol_id removed above so it never changes)
    if (rowsToUpdate.length) {
      for (const c of chunk(rowsToUpdate, CHUNK_SIZE)) {
        const { data: upd, error } = await supabase
          .from(TABLE)
          .upsert(c, {
            onConflict: PK,
            ignoreDuplicates: false, // we DO want update behavior
            count: "exact",
          })
          .select();

        if (error) {
          console.error("Update batch error:", error);
          return serverError({ error: "Failed to update batch", details: error.message });
        }
        results.push(...(upd ?? []));
        updatedCount += upd?.length ?? 0;
      }
    }

    return json({
      success: true,
      operation,
      summary: {
        requested: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: rowsSkipped.length,
      },
      skipped: rowsSkipped, // rows not inserted because articol_id was already taken
      data: results,
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return serverError({ error: "Internal server error", details: msg });
  }
});
