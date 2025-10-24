// sync-from-remote (bidirectional) — optimized
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
const VERSION = "sync-from-remote@2025-10-24-18:40Z";

/** ---------- Types ---------- */
type FilterOps =
  | null
  | string
  | number
  | boolean
  | Record<string, any> // supports {gt,gte,lt,lte,like,ilike,not: X} and arrays => .in
  | Array<string | number | boolean | null>;

type TableItem =
  | string
  | {
      table: string;
      srcTable?: string;
      destTable?: string;
      select?: string;
      conflictTarget?: string;
      sinceColumn?: "updated_at" | "created_at";
      filters?: {
        /** applied to the READER (where we read rows from) */
        source?: Record<string, FilterOps>;
        /** applied to the TARGET (which rows are allowed to be overwritten) */
        target?: Record<string, FilterOps>;
      };
    };

type Body = {
  /** SRC -> DEST, DEST -> SRC, or both */
  direction?: "pull" | "push" | "both";
  /** list of tables (string or per-table object overrides) */
  tables?: TableItem[];
  /** only read rows with sinceColumn >= since (ISO) */
  since?: string;
  /** how many rows to read per page from READER */
  pageSize?: number;
  /** how many rows to write per upsert batch */
  writeBatchSize?: number;
  /** default select (overridable per-table) */
  select?: string;
  /** default conflict key (overridable per-table) */
  conflictTarget?: string;
  /** default since column */
  sinceColumn?: "updated_at" | "created_at";
  /** read only */
  dryRun?: boolean;
  /** set to true to dump request and short-circuit */
  debug?: boolean;
  /** special one-shot connectivity check (no writes) */
  mode?: "probe";
};

/** ---------- Clients & Defaults ---------- */
const DEST = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const SRC = createClient(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"));

const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_SELECT = "*";
const DEFAULT_CONFLICT = "erp_product_code";
const DEFAULT_PAGE = 500; // safe default for reads
const DEFAULT_WRITE_BATCH = 200; // safe default for writes
const MAX_PAGE = 5000;
const MAX_WRITE_BATCH = 1000;
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

    // Hard ID to verify deployment
    const baseMeta = { version: VERSION };

    // 1) Debug short-circuit: immediately echo body
    if (b.debug) {
      console.log("DEBUG payload:", JSON.stringify(b));
      return json({ ok: true, ...baseMeta, mode: "debug-short-circuit", received: b });
    }

    // 2) Probe mode: test REST access to first table of the request (no writes)
    if (b.mode === "probe") {
      const first = resolveFirstTable(b.tables ?? DEFAULT_TABLES);
      const sel = perTableSelect(first, b.select) ?? DEFAULT_SELECT;

      const srcProbe = await restProbe(env("SRC_SUPABASE_URL"), env("SRC_SUPABASE_SERVICE_ROLE_KEY"), first.table, sel);
      const destProbe = await restProbe(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), first.table, sel);

      return json({ ok: true, ...baseMeta, table: first.table, src: srcProbe, dest: destProbe });
    }

    // 3) Normalized request defaults
    const direction = b.direction ?? "pull";
    const pageSize = clamp(b.pageSize ?? DEFAULT_PAGE, 1, MAX_PAGE);
    const writeBatchSize = clamp(b.writeBatchSize ?? DEFAULT_WRITE_BATCH, 1, MAX_WRITE_BATCH);
    const baseSelect = b.select ?? DEFAULT_SELECT;
    const baseConflict = b.conflictTarget ?? DEFAULT_CONFLICT;
    const baseSinceColumn = b.sinceColumn ?? DEFAULT_SINCE_COLUMN;
    const dryRun = !!b.dryRun;

    let sinceISO: string | undefined;
    if (b.since) {
      const dt = new Date(b.since);
      if (isNaN(dt.getTime())) return json({ success: false, error: "Invalid 'since' timestamp" }, 400);
      sinceISO = dt.toISOString();
    }

    // 4) Normalize tables: strings -> objects with defaults
    const tables = (b.tables?.length ? b.tables : DEFAULT_TABLES).map((t) => {
      if (typeof t === "string") {
        return {
          table: t,
          srcTable: t,
          destTable: t,
          select: baseSelect,
          conflictTarget: baseConflict,
          sinceColumn: baseSinceColumn,
          filters: undefined as TableItem extends string ? never : any,
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

    // 5) pull: SRC -> DEST
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
            writeBatchSize,
            dryRun,
            direction: "pull",
            readFilters: t.filters?.source,
            writeFilters: t.filters?.target,
          }),
        );
      }
    }

    // 6) push: DEST -> SRC
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
            writeBatchSize,
            dryRun,
            direction: "push",
            readFilters: t.filters?.source,
            writeFilters: t.filters?.target,
          }),
        );
      }
    }

    const ok = results.every((r) => r.ok);
    return json({ success: ok, ...baseMeta, direction, results });
  } catch (e) {
    return json({ success: false, error: fmtErr(e), version: VERSION }, 500);
  }
});

/** ---------- Core ---------- */
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
  writeBatchSize: number;
  dryRun: boolean;
  direction: "pull" | "push";
  readFilters?: Record<string, FilterOps>;
  writeFilters?: Record<string, FilterOps>;
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
    writeBatchSize,
    dryRun,
    direction,
    readFilters,
    writeFilters,
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
    // Probe reader access quickly (1 row)
    try {
      const { data: probe, error: probeErr } = await reader.from(readTable).select(conflictTarget).limit(1);
      if (probeErr) console.warn(`PROBE(${readTable}) error:`, probeErr.message);
      else console.log(`PROBE(${readTable}) ok, count=${probe?.length ?? 0}`);
    } catch (e) {
      console.warn(`PROBE(${readTable}) threw:`, e);
    }

    let from = 0;
    for (;;) {
      // 1) Read page from READER
      let q = reader
        .from(readTable)
        .select(selectCols)
        .range(from, from + pageSize - 1);
      if (sinceISO) q = q.gte(sinceColumn as any, sinceISO);
      q = applyFiltersToQuery(q, readFilters);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) {
        if (from === 0) {
          const { count, error: headErr } = await reader.from(readTable).select("*", { count: "exact", head: true });
          console.log(`EMPTY-FIRST-PAGE(${readTable})`, { count, err: headErr?.message ?? null });
        }
        break;
      }

      stats.read += rows.length;
      stats.batches += 1;

      // 2) Map to target shape (no-op by default)
      const mapped =
        direction === "pull"
          ? rows.map(transformSrcToDest(readTable, writeTable))
          : rows.map(transformDestToSrc(readTable, writeTable));

      // 3) Optional content-based target write filters on the batch
      let toWrite = writeFilters ? mapped.filter((r: Record<string, any>) => matchesAll(r, writeFilters)) : mapped;

      // 4) Enforce **current TARGET** restriction (only upsert keys matching target filter right now)
      const allowedKeys = await fetchAllowedTargetKeys(writer, writeTable, conflictTarget, writeFilters);
      if (allowedKeys) {
        toWrite = toWrite.filter((r: Record<string, any>) => allowedKeys.has(r[conflictTarget]));
      }

      if (!toWrite.length) {
        from += rows.length;
        continue;
      }

      // 5) Upsert in chunks with minimal returning (prevents timeouts & heavy payloads)
      if (!dryRun) {
        const batches = chunk(toWrite, writeBatchSize);
        for (const batch of batches) {
          const { error: upErr } = await writer
            .from(writeTable)
            .upsert(batch, { onConflict: conflictTarget, returning: "minimal" });
          if (upErr) throw upErr;
          stats.upserted += batch.length;
        }
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

/** ---------- Filters (reader & target) ---------- */
function applyFiltersToQuery(q: any, filters?: Record<string, FilterOps>) {
  if (!filters) return q;
  for (const [key, val] of Object.entries(filters)) {
    if (Array.isArray(val)) {
      q = q.in(key, val as any[]);
    } else if (val !== null && typeof val === "object") {
      const obj = val as Record<string, any>;
      if (Object.prototype.hasOwnProperty.call(obj, "not")) {
        q = obj.not === null ? q.not(key, "is", null) : q.neq(key, obj.not);
      }
      if (Object.prototype.hasOwnProperty.call(obj, "gt")) q = q.gt(key, obj.gt);
      if (Object.prototype.hasOwnProperty.call(obj, "gte")) q = q.gte(key, obj.gte);
      if (Object.prototype.hasOwnProperty.call(obj, "lt")) q = q.lt(key, obj.lt);
      if (Object.prototype.hasOwnProperty.call(obj, "lte")) q = q.lte(key, obj.lte);
      if (Object.prototype.hasOwnProperty.call(obj, "ilike")) q = q.ilike(key, obj.ilike);
      if (Object.prototype.hasOwnProperty.call(obj, "like")) q = q.like(key, obj.like);
      if (Object.prototype.hasOwnProperty.call(obj, "is")) q = q.is(key, obj.is);
    } else if (val === null) {
      q = q.is(key, null);
    } else {
      q = q.eq(key, val);
    }
  }
  return q;
}

function matchesAll(row: Record<string, any>, filters?: Record<string, FilterOps>) {
  if (!filters) return true;
  for (const [key, val] of Object.entries(filters)) {
    const got = row?.[key];
    if (Array.isArray(val)) {
      if (!val.includes(got)) return false;
    } else if (val !== null && typeof val === "object") {
      const obj = val as Record<string, any>;
      if (Object.prototype.hasOwnProperty.call(obj, "not")) {
        if (obj.not === null && got === null) return false;
        if (obj.not !== null && got === obj.not) return false;
      }
      if (Object.prototype.hasOwnProperty.call(obj, "gt") && !(got > obj.gt)) return false;
      if (Object.prototype.hasOwnProperty.call(obj, "gte") && !(got >= obj.gte)) return false;
      if (Object.prototype.hasOwnProperty.call(obj, "lt") && !(got < obj.lt)) return false;
      if (Object.prototype.hasOwnProperty.call(obj, "lte") && !(got <= obj.lte)) return false;
      if (Object.prototype.hasOwnProperty.call(obj, "ilike")) {
        const s = (got ?? "").toString().toLowerCase();
        const pat = obj.ilike.toLowerCase().replace(/%/g, ".*");
        if (!new RegExp(`^${pat}$`).test(s)) return false;
      }
      if (Object.prototype.hasOwnProperty.call(obj, "like")) {
        const s = (got ?? "").toString();
        const pat = obj.like.replace(/%/g, ".*");
        if (!new RegExp(`^${pat}$`).test(s)) return false;
      }
      if (Object.prototype.hasOwnProperty.call(obj, "is")) {
        if (obj.is === null) {
          if (got !== null) return false;
        } else {
          if (got !== obj.is) return false;
        }
      }
    } else if (val === null) {
      if (got !== null) return false;
    } else {
      if (got !== val) return false;
    }
  }
  return true;
}

/** Target-state gate: fetch only keys allowed to be overwritten right now */
async function fetchAllowedTargetKeys(
  writer: any,
  writeTable: string,
  conflictKey: string,
  writeFilters?: Record<string, FilterOps>,
  cap = 200_000,
): Promise<Set<any> | null> {
  if (!writeFilters || !Object.keys(writeFilters).length) return null;

  let q = writer.from(writeTable).select(conflictKey).limit(cap);
  q = applyFiltersToQuery(q, writeFilters);

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

/** ---------- Utilities ---------- */
function resolveFirstTable(items: TableItem[] | string[]) {
  const t = items[0];
  return typeof t === "string"
    ? { table: t, select: DEFAULT_SELECT, conflictTarget: DEFAULT_CONFLICT }
    : { table: t.table, select: t.select ?? DEFAULT_SELECT, conflictTarget: t.conflictTarget ?? DEFAULT_CONFLICT };
}

function perTableSelect(item: ReturnType<typeof resolveFirstTable>, reqSelect?: string) {
  return item.select || reqSelect || DEFAULT_SELECT;
}

async function restProbe(baseUrl: string, serviceKey: string, table: string, select = DEFAULT_SELECT) {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=1`;
  const res = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  let txt = "";
  try {
    txt = await res.text();
  } catch {}
  let body: any = null;
  try {
    body = JSON.parse(txt);
  } catch {
    body = txt;
  }
  return { url, status: res.status, ok: res.ok, contentRange: res.headers.get("content-range"), body };
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
