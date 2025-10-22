// supabase/functions/sync-from-remote/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

type SyncRequest = {
  table: string;                   // e.g. "products"
  since?: string;                  // ISO date/time; only rows with updated_at >= since
  pageSize?: number;               // default 1000
  conflictTarget?: string;         // e.g. "erp_product_code" or "id"
  select?: string;                 // columns to select, default "*"
  dryRun?: boolean;                // don't write, just count
  filter?: Record<string, unknown> // optional equality filters, e.g. { site: "ro" }
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

    // --- validate input
    if (!body?.table) {
      return json({ success: false, error: "Missing 'table' in body" }, 400);
    }

    const table = body.table;
    const since = body.since ? new Date(body.since).toISOString() : undefined;
    const pageSize = Math.min(Math.max(Number(body.pageSize ?? 1000), 1), 5000);
    const conflictTarget = body.conflictTarget; // if unset, upsert uses primary key
    const selectCols = body.select || "*";
    const dryRun = !!body.dryRun;
    const eqFilters = body.filter ?? {};

    const stats = { read: 0, upserted: 0, batches: 0, dryRun };

    // Pull pages until empty
    let from = 0;
    const orderColumn = "id"; // adjust if your table uses another increasing key

    // Optional: count for visibility (can be omitted for speed)
    let count: number | undefined = undefined;
    {
      let q = SRC.from(table).select(orderColumn, { count: "exact", head: true });
      if (since) q = q.gte("updated_at", since);
      for (const [k, v] of Object.entries(eqFilters)) q = q.eq(k, v as any);
      const { count: c, error } = await q;
      if (error) throw error;
      count = c ?? undefined;
    }

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

      // (Optional) transform step if columns differ between source and dest
      const mapped = batch.map(transformRow);

      if (!dryRun) {
        const upsertOptions = conflictTarget ? { onConflict: conflictTarget } : undefined;
        const { error: upErr } = await DEST.from(table).upsert(mapped, upsertOptions);
        if (upErr) throw upErr;
        stats.upserted += mapped.length;
      }

      from += batch.length;
    }

    return json({
      success: true,
      table,
      since,
      count,
      ...stats,
      message: dryRun ? "Dry run completed" : "Sync completed",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sync-from-remote error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});

// ---- row mapping if schemas differ (edit as needed)
function transformRow(row: any) {
  // Example: remap/strip fields
  // return {
  //   id: row.id,
  //   erp_product_code: row.erp_product_code,
  //   updated_at: row.updated_at,
  //   // ...
  // };
  return row; // pass-through when schemas match
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
