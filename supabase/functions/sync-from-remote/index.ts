// supabase/functions/sync-from-remote-multi/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

type SyncRequest = {
  // optional; defaults to both tables shown below
  tables?: string[]; // ["yli_ro_products","yli_hu_products"]
  since?: string; // ISO timestamp; filter by updated_at >= since (if column exists)
  pageSize?: number; // default 1000, max 5000
  conflictTarget?: string; // default "sku"
  select?: string; // default "*"
  dryRun?: boolean; // if true, do not write; just count/read
};

const DEST = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"));

const SRC = createClient(mustEnv("SRC_SUPABASE_URL"), mustEnv("SRC_SUPABASE_SERVICE_ROLE_KEY"));

// sensible defaults for your two product tables
const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_CONFLICT = "sku";
const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 5000;
const DEFAULT_SELECT = "*";

// If your tables don't have updated_at, we’ll skip the since filter safely.
const UPDATED_AT_COLUMN = "updated_at"; // change to "created_at" if you prefer

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (req.method !== "POST") {
      return json({ success: false, error: "Use POST" }, 405);
    }

    let body: SyncRequest = {};
    try {
      body = await req.json();
    } catch {
      // allow empty body → use defaults
      body = {};
    }

    const tables = body.tables && body.tables.length > 0 ? body.tables : DEFAULT_TABLES;
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

    const results: Record<string, unknown> = {};
    for (const table of tables) {
      results[table] = await syncOneTable({
        table,
        pageSize,
        conflictTarget,
        selectCols,
        sinceIso,
        dryRun,
      });
    }

    return json({ success: true, results });
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

  // we’ll use simple ordering by PK-ish column; if your tables have a numeric id, use that
  // these tables use sku as PK, so we’ll paginate by range() without relying on monotonically increasing id
  let from = 0;
  const stats = { read: 0, upserted: 0, batches: 0, dryRun, table };

  // optional count
  let count: number | undefined = undefined;
  try {
    let cq = SRC.from(table).select("*", { head: true, count: "exact" });
    // apply 'since' only if UPDATED_AT_COLUMN exists; we’ll try and if it errors, we ignore the filter
    if (sinceIso) cq = cq.gte(UPDATED_AT_COLUMN as any, sinceIso);
    const { count: c, error: cErr } = await cq;
    if (!cErr) count = c ?? undefined;
  } catch (e) {
    // ignore count errors (e.g., column missing); still proceed
    console.warn(`count(${table}) warning:`, toErr(e));
  }

  while (true) {
    let q = SRC.from(table)
      .select(selectCols)
      .range(from, from + pageSize - 1);

    if (sinceIso) {
      // attempt to apply since; if column doesn't exist, the backend will error — we’ll catch and fallback
      try {
        q = q.gte(UPDATED_AT_COLUMN as any, sinceIso);
      } catch {
        // noop
      }
    }

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

  return { ...stats, count };
}

// Pass-through mapping (edit if destination columns differ)
function transformRow(row: any) {
  // Example: you can rename fields here if local table differs
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

function toErr(e: unknown) {
  if (!e) return "Unknown error";
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return String(e);
  }
}
