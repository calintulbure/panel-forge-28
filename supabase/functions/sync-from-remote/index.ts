// supabase/functions/sync-from-remote-multi/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

type SyncRequest = {
  tables?: string[]; // defaults to both product tables below
  since?: string; // ISO timestamp (applied on CREATED_AT_COLUMN)
  pageSize?: number; // default 1000, max 5000
  conflictTarget?: string; // default "sku"
  select?: string; // default "*"
  dryRun?: boolean; // if true, reads only (no writes)
};

const DEST = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"));

const SRC = createClient(mustEnv("SRC_SUPABASE_URL"), mustEnv("SRC_SUPABASE_SERVICE_ROLE_KEY"));

const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_CONFLICT = "sku";
const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 5000;
const DEFAULT_SELECT = "*";

// ✅ your tables have `created_at`, not `updated_at`
const CREATED_AT_COLUMN = "created_at";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (req.method !== "POST") return json({ success: false, error: "Use POST" }, 405);

    let body: SyncRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const tables = body.tables?.length ? body.tables : DEFAULT_TABLES;
    const pageSize = clampInt(body.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const conflictTarget = body.conflictTarget ?? DEFAULT_CONFLICT;
    const selectCols = body.select ?? DEFAULT_SELECT;
    const dryRun = !!body.dryRun;

    let sinceIso: string | undefined;
    if (body.since) {
      try {
        sinceIso = new Date(body.since).toISOString();
      } catch {
        return json({ success: false, error: "Invalid 'since' timestamp" }, 400);
      }
    }

    const results = [];
    for (const table of tables) {
      const r = await syncOneTable({
        table,
        pageSize,
        conflictTarget,
        selectCols,
        sinceIso,
        dryRun,
      });
      results.push(r);
    }

    const ok = results.every((r) => r.ok);
    return json({
      success: ok,
      results,
      message: ok ? "Completed successfully." : "Completed with errors. See results.",
    });
  } catch (err) {
    console.error("sync-from-remote-multi fatal:", toErr(err));
    return json({ success: false, error: toErr(err) }, 500);
  }
});

async function syncOneTable(opts: {
  table: string;
  pageSize: number;
  conflictTarget: string;
  selectCols: string;
  sinceIso?: string;
  dryRun: boolean;
}) {
  const { table, pageSize, conflictTarget, selectCols, sinceIso, dryRun } = opts;
  const stats = { table, read: 0, upserted: 0, batches: 0, dryRun, ok: false as boolean };

  try {
    // Optional count
    let count: number | undefined = undefined;
    try {
      let cq = SRC.from(table).select("*", { head: true, count: "exact" });
      if (sinceIso) cq = cq.gte(CREATED_AT_COLUMN as any, sinceIso);
      const { count: c, error: cErr } = await cq;
      if (!cErr) count = c ?? undefined;
    } catch (e) {
      console.warn(`count(${table}) warning:`, toErr(e));
    }

    let from = 0;
    while (true) {
      let q = SRC.from(table)
        .select(selectCols)
        .range(from, from + pageSize - 1);
      if (sinceIso) q = q.gte(CREATED_AT_COLUMN as any, sinceIso);

      const { data, error } = await q;
      if (error) throw error;

      const batch = data ?? [];
      if (batch.length === 0) break;

      stats.read += batch.length;
      stats.batches += 1;

      const mapped = batch.map(transformRow);

      if (!dryRun) {
        const { error: upErr } = await DEST.from(table).upsert(mapped, { onConflict: conflictTarget });
        if (upErr) throw upErr;
        stats.upserted += mapped.length;
      }

      from += batch.length;
    }

    stats.ok = true;
    return { ...stats };
  } catch (e) {
    const err = toErr(e);
    console.error(`sync(${table}) error:`, err);
    return { ...stats, ok: false, error: err };
  }
}

// If destination schema differs, map here
function transformRow(row: any) {
  return row;
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

function mustEnv(key: string) {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// Serialize PostgREST / Error objects nicely
function toErr(e: unknown) {
  if (!e) return "Unknown error";
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  try {
    // PostgREST often provides { message, details, hint, code }
    const j = JSON.parse(JSON.stringify(e));
    if (typeof j === "object" && j !== null) return j;
  } catch {
    /* ignore */
  }
  return String(e);
}
