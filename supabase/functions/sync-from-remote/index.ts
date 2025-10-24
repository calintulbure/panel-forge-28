import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

/** ---------- Types ---------- */
type TableItem =
  | string
  | {
      table: string;
      srcTable?: string;
      destTable?: string;
      select?: string;
      conflictTarget?: string;
      sinceColumn?: string;
      filters?: {
        source?: Record<string, any>; // NEW: filter the READER (source) rows
        target?: Record<string, any>; // NEW: filter what we write to TARGET
      };
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
  debug?: boolean; // <--- NEW
};

/** ---------- Clients & Defaults ---------- */
const DEST = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const SRC = createClient(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"));

const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_SELECT = "*";
const DEFAULT_CONFLICT = "sku";
const DEFAULT_PAGE = 1000;
const MAX_PAGE = 5000;
const DEFAULT_SINCE_COLUMN: "updated_at" | "created_at" = "created_at";

/** ---------- HTTP ---------- */
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (req.method !== "POST") return json({ success: false, error: "Use POST" }, 405);

    let b: Body = {};
    try {
      b = await req.json();
    } catch {}

    const debug = !!b.debug;

    if (debug) {
      // Use the first table (or 'products') for probing
      const first =
        b.tables && b.tables.length ? (typeof b.tables[0] === "string" ? b.tables[0] : b.tables[0].table) : "products";

      const srcProbe = await restProbe(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"), first);
      const destProbe = await restProbe(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), first);

      return json({
        debug: true,
        table: first,
        src: srcProbe,
        dest: destProbe,
        note:
          "If src.status!=200 or body is an error, check table exposure (public schema), RLS, or table name. " +
          "If src.status==200 and body is [], your source REST is returning zero rows.",
      });
    }

    const direction = b.direction ?? "pull";
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

    // Normalize table definitions
    const tables = (b.tables?.length ? b.tables : DEFAULT_TABLES).map((t) => {
      if (typeof t === "string") {
        return {
          table: t,
          srcTable: t,
          destTable: t,
          select: baseSelect,
          conflictTarget: baseConflict,
          sinceColumn: baseSinceColumn,
          filters: undefined,
        };
      }
      return {
        table: t.table,
        srcTable: t.srcTable ?? t.table,
        destTable: t.destTable ?? t.table,
        select: t.select ?? baseSelect,
        conflictTarget: t.conflictTarget ?? baseConflict,
        sinceColumn: (t.sinceColumn as "created_at" | "updated_at" | undefined) ?? baseSinceColumn,
        filters: t.filters,
      };
    });

    const results: any[] = [];

    // pull: SRC -> DEST
    if (direction === "pull" || direction === "both") {
      for (const t of tables) {
        results.push(
          await syncOne({
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
            readFilters: t.filters?.source,
            writeFilters: t.filters?.target,
          }),
        );
      }
    }

    // push: DEST -> SRC
    if (direction === "push" || direction === "both") {
      for (const t of tables) {
        results.push(
          await syncOne({
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
            readFilters: t.filters?.source,
            writeFilters: t.filters?.target,
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

/** ---------- Core ---------- */

async function restProbe(baseUrl: string, serviceKey: string, table: string, select = "erp_product_code") {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {}

  let bodyJson: unknown = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {}

  return {
    url,
    status: res.status,
    ok: res.ok,
    contentRange: res.headers.get("content-range"),
    body: bodyJson ?? bodyText,
  };
}

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
  readFilters?: Record<string, any>; // NEW
  writeFilters?: Record<string, any>; // NEW
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
    readFilters,
    writeFilters,
  } = opts;

  const stats = { direction, readTable, writeTable, read: 0, upserted: 0, batches: 0, dryRun, ok: false as boolean };

  try {
    // TEMP PROBE – remove after debugging
    try {
      const { data: probeData, error: probeErr } = await reader.from(readTable).select("*").limit(1);
      console.log("PROBE", {
        readTable,
        gotRow: probeData?.length ?? 0,
        err: probeErr?.message ?? null,
      });
    } catch (e) {
      console.log("PROBE threw", e);
    }

    let from = 0;
    for (;;) {
      // 1) read from source
      let q = reader
        .from(readTable)
        .select(selectCols)
        .range(from, from + pageSize - 1);
      if (sinceISO) q = q.gte(sinceColumn as any, sinceISO);
      q = applyReadFilters(q, readFilters);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) {
        if (from === 0) {
          const { count, error: cntErr } = await reader.from(readTable).select("*", { count: "exact", head: true });
          console.log("EMPTY-FIRST-PAGE", { readTable, count, cntErr: cntErr?.message ?? null });
        }
        break;
      }

      // 2) map to target schema
      const mapped =
        direction === "pull"
          ? rows.map(transformSrcToDest(readTable, writeTable))
          : rows.map(transformDestToSrc(readTable, writeTable));

      // 3) optional: local content-based writeFilters on the batch
      let toWrite = writeFilters ? mapped.filter((r: Record<string, any>) => matchesAll(r, writeFilters)) : mapped;

      // 4) **target state** enforcement: only keys currently matching target filter
      const allowed = await fetchAllowedTargetKeys(writer, writeTable, conflictTarget, writeFilters);
      if (allowed) {
        toWrite = toWrite.filter((r: Record<string, any>) => allowed.has(r[conflictTarget]));
      }

      // nothing to do?
      if (!toWrite.length) {
        from += rows.length;
        continue;
      }

      // 5) upsert
      if (!dryRun) {
        const { error: upErr } = await writer.from(writeTable).upsert(toWrite, { onConflict: conflictTarget });
        if (upErr) throw upErr;
        stats.upserted += toWrite.length;
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

function applyReadFilters(q: any, filters?: Record<string, any>) {
  if (!filters) return q;
  for (const [key, val] of Object.entries(filters)) {
    if (Array.isArray(val)) {
      q = q.in(key, val);
    } else if (val !== null && typeof val === "object") {
      if ("not" in val) q = val.not === null ? q.not(key, "is", null) : q.neq(key, val.not);
      if ("gt" in val) q = q.gt(key, val.gt);
      if ("gte" in val) q = q.gte(key, val.gte);
      if ("lt" in val) q = q.lt(key, val.lt);
      if ("lte" in val) q = q.lte(key, val.lte);
      if ("ilike" in val) q = q.ilike(key, val.ilike);
      if ("like" in val) q = q.like(key, val.like);
    } else if (val === null) {
      q = q.is(key, null);
    } else {
      q = q.eq(key, val);
    }
  }
  return q;
}

function matchesAll(row: Record<string, any>, filters?: Record<string, any>) {
  if (!filters) return true;
  for (const [key, val] of Object.entries(filters)) {
    const got = row?.[key];
    if (Array.isArray(val)) {
      if (!val.includes(got)) return false;
    } else if (val !== null && typeof val === "object") {
      if ("not" in val) {
        if (val.not === null && got === null) return false;
        if (val.not !== null && got === val.not) return false;
      }
      if ("gt" in val && !(got > val.gt)) return false;
      if ("gte" in val && !(got >= val.gte)) return false;
      if ("lt" in val && !(got < val.lt)) return false;
      if ("lte" in val && !(got <= val.lte)) return false;
      if ("ilike" in val) {
        const s = (got ?? "").toString().toLowerCase();
        const pat = val.ilike.toLowerCase().replace(/%/g, ".*");
        if (!new RegExp(`^${pat}$`).test(s)) return false;
      }
      if ("like" in val) {
        const s = (got ?? "").toString();
        const pat = val.like.replace(/%/g, ".*");
        if (!new RegExp(`^${pat}$`).test(s)) return false;
      }
    } else if (val === null) {
      if (got !== null) return false;
    } else {
      if (got !== val) return false;
    }
  }
  return true;
}

async function fetchAllowedTargetKeys(
  writer: any,
  writeTable: string,
  conflictKey: string,
  writeFilters?: Record<string, any>,
  limit = 200000,
): Promise<Set<any> | null> {
  if (!writeFilters || !Object.keys(writeFilters).length) return null;

  let q = writer.from(writeTable).select(conflictKey).limit(limit);
  q = applyReadFilters(q, writeFilters);

  const { data, error } = await q;
  if (error) throw error;

  return new Set((data ?? []).map((r: any) => r[conflictKey]));
}

/** ---------- Optional transformers (no-op by default) ---------- */
function transformSrcToDest(_srcTable: string, _destTable: string) {
  return (row: Record<string, any>) => row;
}
function transformDestToSrc(_readTable: string, _writeTable: string) {
  return (row: Record<string, any>) => row;
}

/** ---------- Utils ---------- */
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
