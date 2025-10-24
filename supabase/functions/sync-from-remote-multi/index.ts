// full-sync-oneway.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const VERSION = "full-sync-oneway@2025-10-24-2";
const DEFAULT_PAGE = 1000;
const DEFAULT_WRITE_BATCH = 500;

// clients
const SRC = createClient(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"));
const DEST = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (req.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);

    const body = await req.json().catch(() => ({} as any));
    const tables = body.tables ?? [{ src: "yli_ro_products", dest: "yli_ro_products", conflictKey: "erp_product_code" }];
    const pageSize = clamp(body.pageSize ?? DEFAULT_PAGE, 1, 5000);
    const writeBatchSize = clamp(body.writeBatchSize ?? DEFAULT_WRITE_BATCH, 1, 1000);
    const dryRun = !!body.dryRun;

    const results: any[] = [];
    for (const t of tables) {
      const srcTable = (t.src ?? t.table) as string;
      const destTable = (t.dest ?? t.src ?? t.table) as string;
      const conflictKey = t.conflictKey ?? t.conflictTarget ?? "id";
      const selectCols = ensureSelectIncludes(t.select ?? "*", conflictKey);

      results.push(
        await fullSyncOneTable({
          srcTable,
          destTable,
          conflictKey,
          selectCols,
          pageSize,
          writeBatchSize,
          dryRun,
        }),
      );
    }

    const ok = results.every((r) => r.ok);
    return json({ ok, version: VERSION, results });
  } catch (e) {
    return json({ ok: false, error: fmtErr(e), version: VERSION }, 500);
  }
});

/** ---------- core function ---------- */
async function fullSyncOneTable(opts: {
  srcTable: string;
  destTable: string;
  conflictKey: string;
  selectCols: string;
  pageSize: number;
  writeBatchSize: number;
  dryRun: boolean;
}) {
  const { srcTable, destTable, conflictKey, selectCols, pageSize, writeBatchSize, dryRun } = opts;
  const stats = { srcTable, destTable, conflictKey, read: 0, upserted: 0, batches: 0, ok: false, dryRun };

  try {
    // quick probe to verify read & write permissions
    try {
      const { data: _probe, error: pErr } = await SRC.from(srcTable).select(conflictKey).limit(1);
      if (pErr) console.warn(`SRC probe error for ${srcTable}:`, pErr.message);
    } catch (e) {
      console.warn("SRC probe threw:", e);
    }
    try {
      const { data: _probe2, error: pErr2 } = await DEST.from(destTable).select(conflictKey).limit(1);
      if (pErr2) console.warn(`DEST probe error for ${destTable}:`, pErr2.message);
    } catch (e) {
      console.warn("DEST probe threw:", e);
    }

    let offset = 0;
    const start = Date.now();

    for (;;) {
      // read a page (range is inclusive)
      const { data, error } = await SRC.from(srcTable).select(selectCols).range(offset, offset + pageSize - 1);
      if (error) throw error;

      const rows = (data ?? []) as Record<string, any>[];
      if (!rows.length) break;

      stats.read += rows.length;
      stats.batches += 1;

      // Validate that conflictKey exists in rows (at least one row has it)
      const missingKeyCount = rows.filter((r) => !(conflictKey in r) || r[conflictKey] === null || r[conflictKey] === undefined).length;
      if (missingKeyCount > 0) {
        // If many rows don't contain the key, that's fatal — return a clear error
        // but allow some rows to be missing; we'll skip missing ones and log them.
        console.warn(`Page starting at offset ${offset}: ${missingKeyCount}/${rows.length} rows missing conflictKey "${conflictKey}". Those rows will be skipped.`);
      }

      // prune rows that lack conflictKey (we can't upsert them)
      const validRows = rows.filter((r) => r && r[conflictKey] !== null && r[conflictKey] !== undefined);

      if (!validRows.length) {
        offset += rows.length;
        continue;
      }

      // batch the upserts
      for (let i = 0; i < validRows.length; i += writeBatchSize) {
        const batch = validRows.slice(i, i + writeBatchSize);

        if (dryRun) {
          // no writes, but count them
          stats.upserted += batch.length;
          continue;
        }

        const { error: upErr } = await DEST.from(destTable).upsert(batch, { onConflict: conflictKey });
        if (upErr) {
          // give helpful debug: include the first problematic item
          const sample = JSON.stringify(batch.slice(0, 3));
          console.error("Upsert failed", {
            destTable,
            conflictKey,
            batchSize: batch.length,
            error: upErr.message ?? upErr,
            sample,
          });
          throw upErr;
        }

        stats.upserted += batch.length;
      }

      offset += rows.length;
    }

    stats.ok = true;
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`SYNC COMPLETE ${srcTable} -> ${destTable}: read=${stats.read}, upserted=${stats.upserted} in ${durationSec}s`);
    return stats;
  } catch (e) {
    const err = fmtErr(e);
    console.error(`sync ${srcTable} -> ${destTable} error:`, err);
    return { ...stats, ok: false, error: err };
  }
}

/** ---------- small helpers ---------- */
function ensureSelectIncludes(selectCols: string, conflictKey: string) {
  if (!selectCols || selectCols.trim() === "*" || selectCols.trim() === " *") return "*";
  const parts = selectCols.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.includes(conflictKey)) parts.push(conflictKey);
  return parts.join(", ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function env(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(), "Content-Type": "application/json" },
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function fmtErr(e: unknown) {
  if (!e) return null;
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return String(e);
  }
}
