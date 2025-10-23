import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

/**
 * Request body
 *
 * - direction: "pull" | "push" | "both"
 * - tables: array of table names or objects with per-table overrides
 * - since: ISO timestamp for incremental sync; applied on SINCE_COLUMN
 * - pageSize: batch size (1..5000)
 * - select: default columns to read (overridable per-table)
 * - conflictTarget: default conflict key (overridable per-table)
 * - sinceColumn: "updated_at" | "created_at" (default "created_at")
 * - dryRun: read only (no writes)
 */
type TableItem =
  | string
  | {
      table: string; // canonical name for this table in both DBs (if same)
      srcTable?: string; // name in SRC (if different)
      destTable?: string; // name in DEST (if different)
      select?: string; // columns to read
      conflictTarget?: string; // upsert key in target
      sinceColumn?: string; // override since column per table
    };

type Body = {
  direction?: "pull" | "push" | "both";
  tables?: TableItem[];
  since?: string;
  pageSize?: number;
  select?: string;
  conflictTarget?: string;
  sinceColumn?: "updated_at" | "created_at";
  dryRun?: boolean;
};

const DEST = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const SRC = createClient(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"));

const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_SELECT = "*";
const DEFAULT_CONFLICT = "sku";
const DEFAULT_PAGE = 1000;
const MAX_PAGE = 5000;
const DEFAULT_SINCE_COLUMN: "updated_at" | "created_at" = "created_at"; // your current tables

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (req.method !== "POST") return json({ success: false, error: "Use POST" }, 405);

    let b: Body = {};
    try {
      b = await req.json();
    } catch {}

    const direction = b.direction ?? "pull"; // pull SRC->DEST by default
    const pageSize = clamp(b.pageSize ?? DEFAULT_PAGE, 1, MAX_PAGE);
    const baseSelect = b.select ?? DEFAULT_SELECT;
    const baseConflict = b.conflictTarget ?? DEFAULT_CONFLICT;
    const baseSinceColumn = b.sinceColumn ?? DEFAULT_SINCE_COLUMN;
    const dryRun = !!b.dryRun;

    let sinceISO: string | undefined;
    if (b.since) {
      try {
        sinceISO = new Date(b.since).toISOString();
      } catch {
        return json({ success: false, error: "Invalid 'since' timestamp" }, 400);
      }
    }

    // normalize tables into a consistent object shape
    const tables = (b.tables?.length ? b.tables : DEFAULT_TABLES).map((t) => {
      if (typeof t === "string") {
        return {
          table: t,
          srcTable: t,
          destTable: t,
          select: baseSelect,
          conflictTarget: baseConflict,
          sinceColumn: baseSinceColumn,
        };
      }
      return {
        table: t.table,
        srcTable: t.srcTable ?? t.table,
        destTable: t.destTable ?? t.table,
        select: t.select ?? baseSelect,
        conflictTarget: t.conflictTarget ?? baseConflict,
        sinceColumn: (t.sinceColumn as "created_at" | "updated_at" | undefined) ?? baseSinceColumn,
      };
    });

    const results: any[] = [];

    if (direction === "pull" || direction === "both") {
      for (const t of tables) {
        results.push(
          await syncOne({
            // SRC -> DEST
            reader: SRC,
            writer: DEST,
            readTable: t.srcTable!,
            writeTable: t.destTable!,
            selectCols: t.select!,
            conflictTarget: t.conflictTarget!,
            sinceISO,
            sinceColumn: t.sinceColumn!,
            pageSize,
            dryRun,
            direction: "pull",
          }),
        );
      }
    }

    if (direction === "push" || direction === "both") {
      for (const t of tables) {
        results.push(
          await syncOne({
            // DEST -> SRC
            reader: DEST,
            writer: SRC,
            readTable: t.destTable!,
            writeTable: t.srcTable!,
            selectCols: t.select!,
            conflictTarget: t.conflictTarget!,
            sinceISO,
            sinceColumn: t.sinceColumn!,
            pageSize,
            dryRun,
            direction: "push",
          }),
        );
      }
    }

    const ok = results.every((r) => r.ok);
    return json({ success: ok, direction, results });
  } catch (e) {
    return json({ success: false, error: fmtErr(e) }, 500);
  }
});

async function syncOne(opts: {
  reader: any;
  writer: any;
  readTable: string;
  writeTable: string;
  selectCols: string;
  conflictTarget: string;
  sinceISO?: string;
  sinceColumn: string;
  pageSize: number;
  dryRun: boolean;
  direction: "pull" | "push";
}) {
  const {
    reader,
    writer,
    readTable,
    writeTable,
    selectCols,
    conflictTarget,
    sinceISO,
    sinceColumn,
    pageSize,
    dryRun,
    direction,
  } = opts;

  const stats = {
    direction,
    readTable,
    writeTable,
    read: 0,
    upserted: 0,
    batches: 0,
    dryRun,
    ok: false as boolean,
  };

  try {
    let from = 0;
    for (;;) {
      let q = reader
        .from(readTable)
        .select(selectCols)
        .range(from, from + pageSize - 1);
      if (sinceISO) q = q.gte(sinceColumn as any, sinceISO);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) break;

      stats.read += rows.length;
      stats.batches += 1;

      // Optional transforms (schema mapping) — customize below if your shapes differ.
      const mapped =
        direction === "pull"
          ? rows.map(transformSrcToDest(readTable, writeTable))
          : rows.map(transformDestToSrc(readTable, writeTable));

      if (!dryRun) {
        const { error: upErr } = await writer.from(writeTable).upsert(mapped, { onConflict: conflictTarget });
        if (upErr) throw upErr;
        stats.upserted += mapped.length;
      }

      from += rows.length;
    }

    stats.ok = true;
    return stats;
  } catch (e) {
    const err = fmtErr(e);
    console.error(`sync ${opts.direction} ${opts.readTable} -> ${opts.writeTable} error:`, err);
    return { ...stats, ok: false, error: err };
  }
}

/** Map a source row (from SRC) to the destination table row (DEST). */
function transformSrcToDest(srcTable: string, destTable: string) {
  return (row: Record<string, any>) => {
    // Default: pass-through (identical schemas)
    // Example mapping per table (uncomment and adapt if needed):
    //
    // if (srcTable === "yli_ro_products" && destTable === "products_ro") {
    //   return {
    //     product_id: row.product_id,
    //     sku: row.sku,
    //     url_key: row.url_key,
    //     status: row.status,
    //     created_at: row.created_at,
    //   };
    // }
    return row;
  };
}

/** Map a destination row (from DEST) to the source table row (SRC). */
function transformDestToSrc(readTable: string, writeTable: string) {
  return (row: Record<string, any>) => {
    // Default: pass-through
    // Example reverse mapping:
    //
    // if (readTable === "products_ro" && writeTable === "yli_ro_products") {
    //   return {
    //     product_id: row.product_id,
    //     sku: row.sku,
    //     url_key: row.site_ro_url,
    //     status: row.status,
    //     created_at: row.created_at,
    //   };
    // }
    return row;
  };
}

function env(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(), "Content-Type": "application/json" } });
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
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
