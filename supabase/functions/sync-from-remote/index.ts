// supabase/functions/sync-multiple-from-remote/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

type TableConfig = {
  source: string;                 // source table name in remote (e.g., "yli_ro_products")
  dest?: string;                  // destination table name in Lovable (defaults to source)
  conflictTarget?: string;        // e.g., "sku" or "id"
  select?: string;                // columns to pull, default "*"
  since?: string;                 // ISO string; pulls rows with updated_at >= since
  pageSize?: number;              // default 1000
  filter?: Record<string, unknown>; // equality filters, e.g., { status: 'active' }
};

type SyncRequest = {
  tables: TableConfig[];
  dryRun?: boolean;               // global dry-run, can be combined with per-table settings if you want
  haltOnError?: boolean;          // stop at first table error (default: false)
  orderColumn?: string;           // default 'id' (change to a monotonic column if needed)
};

const DEST = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SRC = createClient(
  Deno.env.get("SRC_SUPABASE_URL")!,
  Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });

    const body = (await req.json()) as SyncRequest;
    if (!body?.tables?.length) {
      return json({ success: false, error: "Body must include { tables: TableConfig[] }" }, 400);
    }

    const globalDryRun = !!body.dryRun;
    const haltOnError = !!body.haltOnError;
    const defaultOrderColumn = body.orderColumn || "id";

    const results: Array<{
      table: string;
      destTable: string;
      count?: number;
      read: number;
      upserted: number;
      batches: number;
      since?: string;
      dryRun: boolean;
      ok: boolean;
      error?: string;
    }> = [];

    for (const cfg of body.tables) {
      const table = cfg.source;
      const destTable = cfg.dest || table;
      const since = cfg.since ? new Date(cfg.since).toISOString() : undefined;
      const pageSize = Math.min(Math.max(Number(cfg.pageSize ?? 1000), 1), 5000);
      const conflictTarget = cfg.conflictTarget;
      const selectCols = cfg.select || "*";
      const eqFilters = cfg.filter ?? {};
      const orderColumn = defaultOrderColumn;
      const dryRun = globalDryRun;

      const stats = {
        table,
        destTable,
        read: 0,
        upserted: 0,
        batches: 0,
        since,
        dryRun,
        ok: true as boolean,
        error: undefined as string | undefined,
        count: undefined as number | undefined,
      };

      try {
        // Optional: count upfront for visibility
        {
          let q = SRC.from(table).select(orderColumn, { count: "exact", head: true });
          if (since) q = q.gte("updated_at", since);
          for (const [k, v] of Object.entries(eqFilters)) q = q.eq(k, v as any);
          const { count, error } = await q;
          if (error) throw error;
          stats.count = count ?? undefined;
        }

        let from = 0;
        while (true) {
          let q = SRC.from(table)
            .select(selectCols)
            .order(orderColumn, { ascending: true })
            .range(from, from + pageSize - 1);

          if (since) q = q.gte("updated_at", since);
          for (const [k, v] of Object.entries(eqFilters)) q = q.eq(k, v as any);

          const { data, error } = await q;
          if (error) throw error;

          const batch = data ?? [];
          if (batch.length === 0) break;

          stats.read += batch.length;
          stats.batches += 1;

          // Transform hook (edit per table if needed)
          const mapped = batch.map((row) => transformRow(row, table, destTable));

          if (!dryRun) {
            const upsertOptions = conflictTarget ? { onConflict: conflictTarget } : undefined;
            const { error: upErr } = await DEST.from(destTable).upsert(mapped, upsertOptions);
            if (upErr) throw upErr;
            stats.upserted += mapped.length;
          }

          from += batch.length;
        }
      } catch (err) {
        stats.ok = false;
        stats.error = err instanceof Error ? err.message : String(err);
        console.error(`sync error [${table} -> ${destTable}]:`, stats.error);
        results.push(stats);
        if (haltOnError) {
          return json({ success: false, results, message: "Stopped due to error." }, 500);
        }
        continue;
      }

      results.push(stats);
    }

    const ok = results.every((r) => r.ok);
    return json({
      success: ok,
      results,
      message: ok ? "Multi-table sync completed" : "Completed with errors. See results.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-multiple-from-remote error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});

// ---- Transform rows if schemas differ between source and destination.
// Default pass-through; customize per table if needed.
function transformRow(row: any, source: string, dest: string) {
  // Example of table-specific mapping (currently not needed for your schemas):
  // if (source === "yli_ro_products" && dest === "products_ro") {
  //   return {
  //     product_id: row.product_id,
  //     sku: row.sku,
  //     url_key: row.url_key,
  //     status: row.status,
  //     created_at: row.created_at,
  //   };
  // }
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey,
