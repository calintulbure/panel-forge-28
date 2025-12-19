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

    // Fetch all local resources with pagination
    const pageSize = 1000;
    let allLocalResources: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: localError } = await localSupabase
        .from("products_resources")
        .select("*")
        .not("articol_id", "is", null)
        .not("url", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (localError) {
        throw new Error(`Failed to fetch local resources: ${localError.message}`);
      }

      if (pageData && pageData.length > 0) {
        allLocalResources = allLocalResources.concat(pageData);
        console.log(`Fetched page ${page + 1}: ${pageData.length} records (total: ${allLocalResources.length})`);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`Found ${allLocalResources.length} total local resources`);

    let inserted = 0;
    let alreadyExists = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < allLocalResources.length; i += batchSize) {
      const batch = allLocalResources.slice(i, i + batchSize);
      
      const promises = batch.map(async (localResource) => {
        try {
          // Check if record exists on remote
          const { data: remoteRecord, error: findError } = await remoteSupabase
            .from("products_resources")
            .select("resource_id")
            .eq("articol_id", localResource.articol_id)
            .eq("resource_type", localResource.resource_type)
            .eq("url", localResource.url)
            .maybeSingle();

          if (findError) {
            console.error(`Error checking remote for ${localResource.resource_id}:`, findError);
            errors++;
            errorDetails.push(`Find error for ${localResource.resource_id}: ${findError.message}`);
            return;
          }

          if (remoteRecord) {
            // Record already exists
            alreadyExists++;
            return;
          }

          // Insert new record to remote
          const { error: insertError } = await remoteSupabase
            .from("products_resources")
            .insert({
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
            errorDetails.push(`Insert error for ${localResource.resource_id}: ${insertError.message}`);
            return;
          }

          console.log(`Inserted resource ${localResource.resource_id} to remote`);
          inserted++;
        } catch (err) {
          console.error(`Unexpected error for resource ${localResource.resource_id}:`, err);
          errors++;
          errorDetails.push(`Unexpected error for ${localResource.resource_id}: ${err}`);
        }
      });

      await Promise.all(promises);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allLocalResources.length / batchSize)}`);
    }

    const summary = {
      success: true,
      total_local_resources: allLocalResources.length,
      inserted,
      already_exists: alreadyExists,
      errors,
      error_details: errorDetails.slice(0, 20),
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
