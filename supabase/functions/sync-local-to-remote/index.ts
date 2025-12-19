import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting sync of local resources to remote database...");

    // Get database credentials
    const localUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteServiceKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");

    if (!remoteUrl || !remoteServiceKey) {
      throw new Error("Missing remote database credentials (SRC_SUPABASE_URL or SRC_SUPABASE_SERVICE_ROLE_KEY)");
    }

    const localSupabase = createClient(localUrl, localServiceKey);
    const remoteSupabase = createClient(remoteUrl, remoteServiceKey);

    // Process in chunks to avoid memory/time limits.
    // Call this function repeatedly with the returned `next_offset` until `done=true`.
    let offset = 0;
    let pageSize = 25;
    let maxRecords = 250;

    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (body.offset !== undefined) offset = Number(body.offset);
        if (body.pageSize !== undefined) pageSize = Number(body.pageSize);
        if (body.maxRecords !== undefined) maxRecords = Number(body.maxRecords);
      }
    } catch {
      // No JSON body provided; use defaults
    }

    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 25;
    if (pageSize > 100) pageSize = 100;
    if (!Number.isFinite(maxRecords) || maxRecords < 1) maxRecords = 250;
    if (maxRecords > 2000) maxRecords = 2000;

    console.log(`Run options: offset=${offset}, pageSize=${pageSize}, maxRecords=${maxRecords}`);

    const localSelect = [
      "resource_id",
      "articol_id",
      "erp_product_code",
      "resource_type",
      "resource_content",
      "url",
      "server",
      "language",
      "title",
      "description",
      "content_text",
      "meta_json",
      "resource_snapshot",
      "snapshot_at",
      "url_status",
      "url_status_code",
      "url_error",
      "url_checked_at",
      "url_check_count",
      "processed",
      "created_at",
      "updated_at",
    ].join(",");

    let inserted = 0;
    let alreadyExists = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    let checked = 0;
    let noMoreLocal = false;

    while (checked < maxRecords && !noMoreLocal) {
      const from = offset + checked;
      const to = from + pageSize - 1;

      const localResp = await localSupabase
        .from("products_resources")
        .select(localSelect)
        .not("articol_id", "is", null)
        .not("url", "is", null)
        .order("resource_id", { ascending: true })
        .range(from, to);

      if (localResp.error) {
        throw new Error(`Failed to fetch local resources: ${localResp.error.message}`);
      }

      const pageData = (localResp.data as any[]) ?? [];
      if (pageData.length === 0) {
        noMoreLocal = true;
        break;
      }

      console.log(`Fetched ${pageData.length} local records (range ${from}-${to})`);

      for (const row of pageData) {
        const localResource = row as any;

        try {
          const remoteResp = await remoteSupabase
            .from("products_resources")
            .select("resource_id")
            .eq("articol_id", localResource.articol_id)
            .eq("resource_type", localResource.resource_type)
            .eq("url", localResource.url)
            .limit(1);

          if (remoteResp.error) {
            console.error(`Error checking remote for ${localResource.resource_id}:`, remoteResp.error);
            errors++;
            if (errorDetails.length < 25) {
              errorDetails.push(`Find error for ${localResource.resource_id}: ${remoteResp.error.message}`);
            }
            continue;
          }

          const remoteMatches = (remoteResp.data as any[]) ?? [];
          if (remoteMatches.length > 0) {
            alreadyExists++;
            continue;
          }

          const { error: insertError } = await remoteSupabase.from("products_resources").insert({
            resource_id: localResource.resource_id,
            articol_id: localResource.articol_id,
            erp_product_code: localResource.erp_product_code,
            resource_type: localResource.resource_type,
            resource_content: localResource.resource_content,
            url: localResource.url,
            server: localResource.server,
            language: localResource.language,
            title: localResource.title,
            description: localResource.description,
            content_text: localResource.content_text,
            meta_json: localResource.meta_json,
            resource_snapshot: localResource.resource_snapshot,
            snapshot_at: localResource.snapshot_at,
            url_status: localResource.url_status,
            url_status_code: localResource.url_status_code,
            url_error: localResource.url_error,
            url_checked_at: localResource.url_checked_at,
            url_check_count: localResource.url_check_count,
            processed: localResource.processed,
            created_at: localResource.created_at,
            updated_at: localResource.updated_at,
          });

          if (insertError) {
            console.error(`Error inserting resource ${localResource.resource_id}:`, insertError);
            errors++;
            if (errorDetails.length < 25) {
              errorDetails.push(`Insert error for ${localResource.resource_id}: ${insertError.message}`);
            }
            continue;
          }

          inserted++;
        } catch (err) {
          console.error(`Unexpected error for resource ${localResource.resource_id}:`, err);
          errors++;
          if (errorDetails.length < 25) {
            errorDetails.push(`Unexpected error for ${localResource.resource_id}: ${err}`);
          }
        }
      }

      checked += pageData.length;
      console.log(
        `Progress this run: checked=${checked}/${maxRecords}, inserted=${inserted}, exists=${alreadyExists}, errors=${errors}`,
      );

      if (pageData.length < pageSize) {
        noMoreLocal = true;
      }
    }

    const nextOffset = offset + checked;
    const summary = {
      success: true,
      offset,
      checked,
      next_offset: nextOffset,
      done: noMoreLocal,
      inserted,
      already_exists: alreadyExists,
      errors,
      error_details: errorDetails,
    };

    console.log("Sync completed:", summary);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in sync-local-to-remote:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
