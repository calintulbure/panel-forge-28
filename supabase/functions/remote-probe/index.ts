import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const SRC = createClient(
  mustEnv("SRC_SUPABASE_URL"),
  mustEnv("SRC_SUPABASE_SERVICE_ROLE_KEY"), // must be SERVICE role key
);

Deno.serve(async (req) => {
  try {
    const { table = "yli_ro_products", select = "sku", limit = 5 } = await safeJson(req);

    const { data, error } = await SRC.from(table).select(select).limit(limit);
    return json({
      ok: !error,
      table, select, limit,
      data,
      error: formatErr(error),
    }, error ? 500 : 200);
  } catch (e) {
    return json({ ok: false, error: formatErr(e) }, 500);
  }
});

async function safeJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function mustEnv(k: string) { const v = Deno.env.get(k); if (!v) throw new Error(`Missing env ${k}`); return v; }
function json(d: unknown, s=200) { return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type":"application/json" } }); }
function formatErr(e: unknown) {
  if (!e) return null;
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  try { return JSON.parse(JSON.stringify(e)); } catch { return String(e); }
}
