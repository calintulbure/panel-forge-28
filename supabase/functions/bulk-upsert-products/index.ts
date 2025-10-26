import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { BulkUpsertRequest, BulkUpsertResponse } from "../_shared/schema.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// --- Config: destination table and conflict key
const DEST_TABLE = "products";
const CONFLICT_KEY = "articol_id";

// Fields that are allowed to be UPDATED on existing rows (user-specified)
const ALLOWED_UPDATE_FIELDS = new Set([
  "articol_id",
  "erp_product_code",
  "producator",
  "erp_product_description",
  "categ1",
  "categ2",
  "categ3",
  "stare_oferta",
  "stare_stoc",
  "stare_oferta_secundara",
  "senior_erp_link",
  "ro_stock",
  "ro_stoc_detailed",
  "hu_stock",
  "hu_stock_detailed",
]);

// Batch sizes
const BATCH_INSERT = 300;
const BATCH_UPSERT = 300;

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = BulkUpsertRequest.safeParse(body);

    if (!parsed.success) {
      // If schema parse fails, return 400; this preserves your original behavior
      return json({ success: false, affected: 0, error: parsed.error.message }, 400);
    }

    // Expecting parsed.data.payload to be an array of objects
    const payload = parsed.data.payload;
    if (!Array.isArray(payload) || payload.length === 0) {
      return json({ success: true, affected: 0, message: "No rows to process" }, 200);
    }

    // Normalize and validate presence of conflict key in payload items
    const rows = payload.map((r: any) => (typeof r === "object" && r ? r : {}));
    const keys = Array.from(new Set(rows.map((r) => r[CONFLICT_KEY]).filter(Boolean)));

    if (!keys.length) {
      return json({ success: false, affected: 0, error: `No ${CONFLICT_KEY} values found in payload` }, 400);
    }

    // 1) Fetch existing keys in destination
    const { data: existingRows, error: fetchErr } = await supabase
      .from(DEST_TABLE)
      .select(CONFLICT_KEY)
      .in(CONFLICT_KEY, keys)
      .limit(200000); // reasonable cap for one call; adjust if you expect >200k keys

    if (fetchErr) throw fetchErr;

    const existingSet = new Set((existingRows ?? []).map((r: any) => r[CONFLICT_KEY]));

    // 2) Split into inserts and updates
    const inserts: any[] = [];
    const updates: any[] = [];

    for (const row of rows) {
      const key = row[CONFLICT_KEY];
      if (!key) continue; // skip rows without the key

      if (existingSet.has(key)) {
        // Build update object: include conflict key + only ALLOWED_UPDATE_FIELDS (but skip null/undefined)
        const upd: Record<string, any> = { [CONFLICT_KEY]: key };
        for (const f of ALLOWED_UPDATE_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(row, f)) {
            // Include the field even if it's null (to allow clearing fields)
            upd[f] = row[f];
          }
        }
        // Only push if there's at least one allowed field to update (besides key)
        if (Object.keys(upd).length > 1) updates.push(upd);
      } else {
        // New row: insert as-is (user must provide all required insert columns)
        inserts.push(row);
      }
    }

    // 3) Batch-insert new rows
    let inserted = 0;
    if (inserts.length) {
      const insertChunks = chunk(inserts, BATCH_INSERT);
      for (const c of insertChunks) {
        const { error: iErr } = await supabase.from(DEST_TABLE).insert(c);
        if (iErr) {
          // If insert fails (e.g., missing required fields), bubble up error with sample
          console.error("INSERT ERROR sample:", JSON.stringify(c.slice(0, 3)));
          throw iErr;
        }
        inserted += c.length;
      }
    }

    // 4) Batch-upsert updates (only allowed fields + key are present in each object)
    let upserted = 0;
    if (updates.length) {
      const upChunks = chunk(updates, BATCH_UPSERT);
      for (const c of upChunks) {
        const { error: uErr } = await supabase.from(DEST_TABLE).upsert(c, { onConflict: CONFLICT_KEY });
        if (uErr) {
          console.error("UPSERT ERROR sample:", JSON.stringify(c.slice(0, 3)));
          throw uErr;
        }
        upserted += c.length;
      }
    }

    const affected = inserted + upserted;
    const resp: BulkUpsertResponse = {
      success: true,
      affected,
      message: `Inserted ${inserted} rows, updated ${upserted} rows (only allowed fields).`,
    };
    return json(resp);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("bulk upsert error:", errorMessage, err);
    return json({ success: false, affected: 0, error: errorMessage }, 500);
  }
});

/** ---------- helpers ---------- */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
