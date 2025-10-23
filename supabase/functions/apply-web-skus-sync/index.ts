import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Optional: simple shared-secret protection
const ADMIN_TASK_TOKEN = Deno.env.get("ADMIN_TASK_TOKEN") ?? "";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (req.method !== "POST") {
      return json({ success: false, error: "Use POST" }, 405);
    }

    // Optional auth guard
    const headerToken = req.headers.get("x-admin-task-token") ?? "";
    if (ADMIN_TASK_TOKEN && headerToken !== ADMIN_TASK_TOKEN) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await safeJson(req);
    const run_ro = body?.run_ro ?? true;
    const run_hu = body?.run_hu ?? true;
    const validated_only = body?.validated_only ?? true;

    console.log(`Starting products sync: run_ro=${run_ro}, run_hu=${run_hu}, validated_only=${validated_only}`);

    const { data, error } = await supabase.rpc("update_products_from_sources", {
      run_ro,
      run_hu,
      validated_only,
    });

    if (error) throw error;

    console.log(`Sync completed successfully:`, data);

    return json({ success: true, result: data });
  } catch (e: any) {
    console.error("Error in apply-web-skus-sync:", e);
    return json({ success: false, error: fmtErr(e) }, 400);
  }
});

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-task-token",
  };
}

function fmtErr(e: unknown) {
  if (!e) return null;
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  try { return JSON.parse(JSON.stringify(e)); } catch { return String(e); }
}
