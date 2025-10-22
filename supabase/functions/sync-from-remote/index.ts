import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const SRC = createClient(mustEnv("SRC_SUPABASE_URL"), mustEnv("SRC_SUPABASE_SERVICE_ROLE_KEY"));

const DEFAULT_TABLES = ["yli_ro_products", "yli_hu_products"];
const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 5000;
const DEFAULT_SELECT = "sku"; // narrow select to reduce payload / errors

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (req.method !== "POST") return json({ success: false, error: "Use POST" }, 405);

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const tables: string[] = Array.isArray(body.tables) && body.tables.length ? body.tables : DEFAULT_TABLES;

    const selectCols = body.select ?? DEFAULT_SELECT;
    const pageSize = clampInt(body.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

    const results = [];
    for (const table of tables) {
      results.push(await readOnlyOne(table, selectCols, pageSize));
    }

    const ok = results.every((r) => r.ok);
    return json({ success: ok, results, message: ok ? "Read OK" : "Read completed with errors" });
  } catch (e) {
    return json({ success: false, error: formatErr(e) }, 500);
  }
});

async function readOnlyOne(table: string, selectCols: string, pageSize: number) {
  const stats = { table, read: 0, batches: 0, ok: false as boolean };

  try {
    let from = 0;
    while (true) {
      const { data, error } = await SRC.from(table)
        .select(selectCols)
        .range(from, from + pageSize - 1);

      if (error) throw error;
      const batch = data ?? [];
      if (batch.length === 0) break;

      stats.read += batch.length;
      stats.batches += 1;
      from += batch.length;
    }

    stats.ok = true;
    return stats;
  } catch (e) {
    const err = formatErr(e);
    console.error(`readOnly(${table}) error:`, err);
    return { ...stats, ok: false, error: err };
  }
}

function mustEnv(k: string) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...cors(), "Content-Type": "application/json" } });
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}
function formatErr(e: unknown) {
  if (!e) return null;
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return String(e);
  }
}
