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
    console.log("Starting resource_id alignment between local and remote databases...");

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

    // Fetch all local resources
    const { data: localResources, error: localError } = await localSupabase
      .from("products_resources")
      .select("resource_id, articol_id, resource_type, url")
      .not("articol_id", "is", null)
      .not("url", "is", null);

    if (localError) {
      throw new Error(`Failed to fetch local resources: ${localError.message}`);
    }

    console.log(`Found ${localResources?.length || 0} local resources to align`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process in batches to avoid overwhelming the remote database
    const batchSize = 50;
    for (let i = 0; i < (localResources?.length || 0); i += batchSize) {
      const batch = localResources!.slice(i, i + batchSize);
      
      const promises = batch.map(async (localResource) => {
        try {
          const { data: remoteRecord, error: findError } = await remoteSupabase
            .from("products_resources")
            .select("resource_id")
            .eq("articol_id", localResource.articol_id)
            .eq("resource_type", localResource.resource_type)
            .eq("url", localResource.url)
            .maybeSingle();

          if (findError) {
            console.error(`Error finding remote record for local ${localResource.resource_id}:`, findError);
            errors++;
            errorDetails.push(`Find error for ${localResource.resource_id}: ${findError.message}`);
            return;
          }

          if (!remoteRecord) {
            console.log(`No remote match for local resource ${localResource.resource_id}`);
            notFound++;
            return;
          }

          // Skip if resource_id already matches
          if (remoteRecord.resource_id === localResource.resource_id) {
            console.log(`Resource ${localResource.resource_id} already aligned`);
            updated++; // Count as success
            return;
          }

          // Update remote resource_id to match local
          const { error: updateError } = await remoteSupabase
            .from("products_resources")
            .update({ resource_id: localResource.resource_id })
            .eq("articol_id", localResource.articol_id)
            .eq("resource_type", localResource.resource_type)
            .eq("url", localResource.url);

          if (updateError) {
            console.error(`Error updating remote resource_id for ${localResource.resource_id}:`, updateError);
            errors++;
            errorDetails.push(`Update error for ${localResource.resource_id}: ${updateError.message}`);
            return;
          }

          console.log(`Aligned resource_id ${localResource.resource_id} (was ${remoteRecord.resource_id} on remote)`);
          updated++;
        } catch (err) {
          console.error(`Unexpected error for resource ${localResource.resource_id}:`, err);
          errors++;
          errorDetails.push(`Unexpected error for ${localResource.resource_id}: ${err}`);
        }
      });

      await Promise.all(promises);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil((localResources?.length || 0) / batchSize)}`);
    }

    const summary = {
      success: true,
      total_local_resources: localResources?.length || 0,
      updated,
      not_found_on_remote: notFound,
      errors,
      error_details: errorDetails.slice(0, 10), // Limit error details
    };

    console.log("Alignment completed:", summary);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in align-resource-ids:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
