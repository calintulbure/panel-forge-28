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

    // Parameters:
    // - mode: "sync" (insert only), "delete" (delete only), "full" (both)
    // - offset, pageSize, maxRecords: for chunked processing
    let offset = 0;
    let pageSize = 25;
    let maxRecords = 250;
    let mode = "sync"; // "sync" | "delete" | "full"

    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (body.offset !== undefined) offset = Number(body.offset);
        if (body.pageSize !== undefined) pageSize = Number(body.pageSize);
        if (body.maxRecords !== undefined) maxRecords = Number(body.maxRecords);
        if (body.mode !== undefined) mode = String(body.mode);
      }
    } catch {
      // No JSON body provided; use defaults
    }

    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 25;
    if (pageSize > 100) pageSize = 100;
    if (!Number.isFinite(maxRecords) || maxRecords < 1) maxRecords = 250;
    if (maxRecords > 2000) maxRecords = 2000;
    if (!["sync", "delete", "full"].includes(mode)) mode = "sync";

    console.log(`Run options: mode=${mode}, offset=${offset}, pageSize=${pageSize}, maxRecords=${maxRecords}`);

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
    let deleted = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    let checked = 0;
    let noMore = false;

    // MODE: SYNC (insert new records from local to remote)
    if (mode === "sync" || mode === "full") {
      while (checked < maxRecords && !noMore) {
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
          noMore = true;
          break;
        }

        console.log(`[SYNC] Fetched ${pageData.length} local records (range ${from}-${to})`);

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
          `[SYNC] Progress: checked=${checked}/${maxRecords}, inserted=${inserted}, exists=${alreadyExists}, errors=${errors}`,
        );

        if (pageData.length < pageSize) {
          noMore = true;
        }
      }
    }

    // MODE: DELETE (remove records from remote that don't exist locally)
    if (mode === "delete" || mode === "full") {
      // Reset for delete pass if doing full mode
      if (mode === "full") {
        checked = 0;
        noMore = false;
      }

      while (checked < maxRecords && !noMore) {
        const from = offset + checked;
        const to = from + pageSize - 1;

        // Fetch remote records
        const remoteResp = await remoteSupabase
          .from("products_resources")
          .select("resource_id, articol_id, resource_type, url")
          .not("articol_id", "is", null)
          .not("url", "is", null)
          .order("resource_id", { ascending: true })
          .range(from, to);

        if (remoteResp.error) {
          throw new Error(`Failed to fetch remote resources: ${remoteResp.error.message}`);
        }

        const pageData = (remoteResp.data as any[]) ?? [];
        if (pageData.length === 0) {
          noMore = true;
          break;
        }

        console.log(`[DELETE] Fetched ${pageData.length} remote records (range ${from}-${to})`);

        for (const remoteResource of pageData) {
          try {
            // Check if this record exists locally
            const localResp = await localSupabase
              .from("products_resources")
              .select("resource_id")
              .eq("articol_id", remoteResource.articol_id)
              .eq("resource_type", remoteResource.resource_type)
              .eq("url", remoteResource.url)
              .limit(1);

            if (localResp.error) {
              console.error(`Error checking local for ${remoteResource.resource_id}:`, localResp.error);
              errors++;
              if (errorDetails.length < 25) {
                errorDetails.push(`Local find error for ${remoteResource.resource_id}: ${localResp.error.message}`);
              }
              continue;
            }

            const localMatches = (localResp.data as any[]) ?? [];
            if (localMatches.length > 0) {
              // Exists locally, keep it
              alreadyExists++;
              continue;
            }

            // Does NOT exist locally - delete from remote
            const { error: deleteError } = await remoteSupabase
              .from("products_resources")
              .delete()
              .eq("resource_id", remoteResource.resource_id);

            if (deleteError) {
              console.error(`Error deleting resource ${remoteResource.resource_id}:`, deleteError);
              errors++;
              if (errorDetails.length < 25) {
                errorDetails.push(`Delete error for ${remoteResource.resource_id}: ${deleteError.message}`);
              }
              continue;
            }

            deleted++;
            console.log(`[DELETE] Removed remote resource_id=${remoteResource.resource_id} (not found locally)`);
          } catch (err) {
            console.error(`Unexpected error for resource ${remoteResource.resource_id}:`, err);
            errors++;
            if (errorDetails.length < 25) {
              errorDetails.push(`Unexpected error for ${remoteResource.resource_id}: ${err}`);
            }
          }
        }

        checked += pageData.length;
        console.log(
          `[DELETE] Progress: checked=${checked}/${maxRecords}, deleted=${deleted}, kept=${alreadyExists}, errors=${errors}`,
        );

        if (pageData.length < pageSize) {
          noMore = true;
        }
      }
    }

    const nextOffset = offset + checked;
    const summary = {
      success: true,
      mode,
      offset,
      checked,
      next_offset: nextOffset,
      done: noMore,
      inserted,
      already_exists: alreadyExists,
      deleted,
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
