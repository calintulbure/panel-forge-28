// supabase/functions/manage-products/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const VERSION = "manage-products@2025-10-21-15"; // bump this every deploy

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, unknown>;

const TABLE = "products";
const PK = "erp_product_code"; // primary key
const UK = "articol_id"; // unique, MUST NEVER change once set
const CHUNK_SIZE = 500;
const VERSION = "manage-products@upsert-never-change-articol_id-2025-10-21";

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

    // Accept "upsert" (preferred), but keep backward compat with "insert"/"update"
    const op = String(operation || "upsert").toLowerCase();
    if (!["upsert", "insert", "update"].includes(op)) {
      return badRequest({ error: 'Invalid operation. Use "upsert" (recommended), or "insert"/"update".' });
    }
    if (rows.length === 0) {
      return badRequest({ error: "data must be an object or non-empty array" });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Gather keys present in this request
    const incomingPKs = Array.from(new Set(rows.map((r) => r[PK]).filter((v) => v != null))) as (string | number)[];
    const incomingUKs = Array.from(new Set(rows.map((r) => r[UK]).filter((v) => v != null))) as (string | number)[];

    // What already exists in DB (seed the “seen” sets)
    const [pkRes, ukRes] = await Promise.all([
      incomingPKs.length
        ? supabase.from(TABLE).select(PK).in(PK, incomingPKs)
        : Promise.resolve({ data: [], error: null } as any),
      incomingUKs.length
        ? supabase.from(TABLE).select(UK).in(UK, incomingUKs)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (pkRes.error || ukRes.error) {
      return serverError({
        error: "Failed to detect existing keys",
        details: pkRes.error?.message || ukRes.error?.message,
      });
    }

    // Track keys that exist in DB OR have been accepted earlier in this same request
    const seenPK = new Set((pkRes.data ?? []).map((r: any) => r[PK]));
    const seenUK = new Set((ukRes.data ?? []).map((r: any) => r[UK]));

    const rowsToInsert: Row[] = [];
    const rowsToUpdate: Row[] = [];
    const skipped: { row: Row; reason: string }[] = [];

    for (const r of rows) {
      const pk = r[PK];
      const uk = r[UK];
      const hasPK = pk != null;
      const hasUK = uk != null;

      // If PK already exists (in DB or accepted earlier this request) → UPDATE
      if (hasPK && seenPK.has(pk as any)) {
        const copy: Row = { ...r };
        // NEVER allow articol_id to change on update
        delete copy[UK];
        rowsToUpdate.push(copy);
        continue;
      }

      // If caller explicitly used "update" but row has no PK, skip it
      if (op === "update" && !hasPK) {
        skipped.push({ row: r, reason: `Missing ${PK} on update` });
        continue;
      }

      // Otherwise this is a candidate INSERT / UPSERT-INSERT
      // articol_id must be unused (in DB or earlier this request)
      if (hasUK && seenUK.has(uk as any)) {
        skipped.push({ row: r, reason: `${UK} already used` });
        continue;
      }

      // Accept as new row; mark keys as seen to protect following batches in the same request
      if (hasPK) seenPK.add(pk as any);
      if (hasUK) seenUK.add(uk as any);
      rowsToInsert.push(r);
    }

    const results: Row[] = [];
    let inserted = 0;
    let updated = 0;

    // INSERTS (keep articol_id as provided)
    if (rowsToInsert.length) {
      for (const c of chunk(rowsToInsert, CHUNK_SIZE)) {
        // Upsert on PK with ignoreDuplicates true makes restarts safe
        const { data: ins, error } = await supabase
          .from(TABLE)
          .upsert(c, { onConflict: PK, ignoreDuplicates: true, count: "exact" })
          .select();
        if (error) {
          console.error("Insert batch error:", error);
          return serverError({ error: "Failed to insert batch", details: error.message, version: VERSION });
        }
        results.push(...(ins ?? []));
        inserted += ins?.length ?? 0;
      }
    }

    // UPDATES (NEVER send articol_id)
    if (rowsToUpdate.length) {
      for (const c of chunk(rowsToUpdate, CHUNK_SIZE)) {
        const { data: upd, error } = await supabase
          .from(TABLE)
          .upsert(c, { onConflict: PK, ignoreDuplicates: false, count: "exact" })
          .select();
        if (error) {
          console.error("Update batch error:", error);
          return serverError({ error: "Failed to update batch", details: error.message, version: VERSION });
        }
        results.push(...(upd ?? []));
        updated += upd?.length ?? 0;
      }
    }

    return json({
      success: true,
      version: VERSION,
      operation: op,
      summary: { requested: rows.length, inserted, updated, skipped: skipped.length },
      skipped,
      data: results,
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return serverError({ error: "Internal server error", details: msg, version: VERSION });
  }
});
