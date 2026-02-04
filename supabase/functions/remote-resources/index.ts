import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResourceRecord {
  resource_id?: number;
  articol_id?: number | null;
  erp_product_code?: string | null;
  resource_type?: string;
  resource_content?: string | null;
  url?: string | null;
  server?: string | null;
  language?: string | null;
  title?: string | null;
  description?: string | null;
  content_text?: string | null;
  meta_json?: any;
  resource_snapshot?: string | null;
  snapshot_at?: string | null;
  url_status?: string | null;
  url_status_code?: number | null;
  url_error?: string | null;
  url_checked_at?: string | null;
  url_check_count?: number | null;
  processed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Helper function to update resource_count and resource_unprocessed_count in local products table
async function updateLocalResourceCounts(
  localSupabase: any,
  remoteSupabase: any,
  articolId: number
): Promise<void> {
  try {
    // Count total resources on remote
    const { count: totalCount, error: countError } = await remoteSupabase
      .from("products_resources")
      .select("*", { count: "exact", head: true })
      .eq("articol_id", articolId);

    if (countError) {
      console.error("[updateLocalResourceCounts] Count error:", countError);
      return;
    }

    // Count unprocessed resources (processed is null, false, or not 'Processed')
    const { count: unprocessedCount, error: unprocessedError } = await remoteSupabase
      .from("products_resources")
      .select("*", { count: "exact", head: true })
      .eq("articol_id", articolId)
      .or("processed.is.null,processed.eq.false");

    if (unprocessedError) {
      console.error("[updateLocalResourceCounts] Unprocessed count error:", unprocessedError);
      return;
    }

    // Update local products table
    const { error: updateError } = await localSupabase
      .from("products")
      .update({ 
        resource_count: totalCount || 0,
        resource_unprocessed_count: unprocessedCount || 0
      })
      .eq("articol_id", articolId);

    if (updateError) {
      console.error("[updateLocalResourceCounts] Update error:", updateError);
      return;
    }

    console.log(`[updateLocalResourceCounts] Updated articol_id=${articolId} to count=${totalCount}, unprocessed=${unprocessedCount}`);
  } catch (error) {
    console.error("[updateLocalResourceCounts] Error:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteUrl = Deno.env.get("SRC_SUPABASE_URL");
    const remoteServiceKey = Deno.env.get("SRC_SUPABASE_SERVICE_ROLE_KEY");
    const localUrl = Deno.env.get("SUPABASE_URL");
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!remoteUrl || !remoteServiceKey) {
      throw new Error("Missing remote database credentials");
    }
    if (!localUrl || !localServiceKey) {
      throw new Error("Missing local database credentials");
    }

    const remoteSupabase = createClient(remoteUrl, remoteServiceKey);
    const localSupabase = createClient(localUrl, localServiceKey);

    const body = await req.json();
    const { action } = body;

    console.log(`[remote-resources] Action: ${action}`);

    switch (action) {
      case "list": {
        const { articol_id, filters } = body;
        
        let query = remoteSupabase
          .from("products_resources")
          .select("resource_id, resource_type, resource_content, url, server, language, title, description, url_status, processed, created_at, resource_snapshot");

        if (articol_id) {
          query = query.eq("articol_id", articol_id);
        }

        if (filters?.resource_type) {
          query = query.eq("resource_type", filters.resource_type);
        }
        if (filters?.resource_content) {
          query = query.eq("resource_content", filters.resource_content);
        }
        if (filters?.server) {
          if (Array.isArray(filters.server)) {
            query = query.in("server", filters.server);
          } else {
            query = query.eq("server", filters.server);
          }
        }
        if (filters?.language) {
          query = query.eq("language", filters.language);
        }
        if (filters?.erp_product_code) {
          query = query.eq("erp_product_code", filters.erp_product_code);
        }

        const { data, error, count } = await query.order("created_at", { ascending: false });

        if (error) {
          console.error("[list] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, data, count }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "count": {
        const { articol_id } = body;
        
        const { count, error } = await remoteSupabase
          .from("products_resources")
          .select("*", { count: "exact", head: true })
          .eq("articol_id", articol_id);

        if (error) {
          console.error("[count] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, count }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get": {
        const { resource_id, articol_id, filters } = body;

        let query = remoteSupabase.from("products_resources").select("*");

        if (resource_id) {
          query = query.eq("resource_id", resource_id);
        }
        if (articol_id) {
          query = query.eq("articol_id", articol_id);
        }
        if (filters?.resource_type) {
          query = query.eq("resource_type", filters.resource_type);
        }
        if (filters?.resource_content) {
          query = query.eq("resource_content", filters.resource_content);
        }
        if (filters?.server) {
          if (Array.isArray(filters.server)) {
            query = query.in("server", filters.server);
          } else {
            query = query.eq("server", filters.server);
          }
        }
        if (filters?.language) {
          query = query.eq("language", filters.language);
        }
        if (filters?.erp_product_code) {
          query = query.eq("erp_product_code", filters.erp_product_code);
        }

        const { data, error } = await query;

        if (error) {
          console.error("[get] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "insert": {
        const { record } = body as { record: ResourceRecord };

        if (!record) {
          return new Response(JSON.stringify({ success: false, error: "Missing record" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if already exists by URL and articol_id
        if (record.url && record.articol_id) {
          const { data: existing } = await remoteSupabase
            .from("products_resources")
            .select("resource_id")
            .eq("articol_id", record.articol_id)
            .eq("url", record.url)
            .maybeSingle();

          if (existing) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "Resource with this URL already exists",
              existing_id: existing.resource_id 
            }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const { data, error } = await remoteSupabase
          .from("products_resources")
          .insert(record)
          .select()
          .single();

        if (error) {
          console.error("[insert] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update local resource counts
        if (record.articol_id) {
          await updateLocalResourceCounts(localSupabase, remoteSupabase, record.articol_id);
        }

        console.log(`[insert] Inserted resource_id=${data.resource_id}`);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const { resource_id, record, filters } = body as { 
          resource_id?: number; 
          record: Partial<ResourceRecord>;
          filters?: { erp_product_code?: string; language?: string; resource_type?: string };
        };

        if (!record) {
          return new Response(JSON.stringify({ success: false, error: "Missing record" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let query = remoteSupabase.from("products_resources").update({
          ...record,
          updated_at: new Date().toISOString(),
        });

        if (resource_id) {
          query = query.eq("resource_id", resource_id);
        }
        if (filters?.erp_product_code) {
          query = query.eq("erp_product_code", filters.erp_product_code);
        }
        if (filters?.language) {
          query = query.eq("language", filters.language);
        }
        if (filters?.resource_type) {
          query = query.eq("resource_type", filters.resource_type);
        }

        const { data, error } = await query.select().single();

        if (error) {
          console.error("[update] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[update] Updated resource_id=${data?.resource_id}`);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "upsert": {
        const { record, match_on } = body as { 
          record: ResourceRecord; 
          match_on?: { erp_product_code?: string; language?: string; resource_type?: string };
        };

        if (!record) {
          return new Response(JSON.stringify({ success: false, error: "Missing record" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if exists
        let existingQuery = remoteSupabase.from("products_resources").select("resource_id");
        
        if (match_on?.erp_product_code) {
          existingQuery = existingQuery.eq("erp_product_code", match_on.erp_product_code);
        }
        if (match_on?.language) {
          existingQuery = existingQuery.eq("language", match_on.language);
        }
        if (match_on?.resource_type) {
          existingQuery = existingQuery.eq("resource_type", match_on.resource_type);
        }

        const { data: existing } = await existingQuery.maybeSingle();

        if (existing) {
          // Update
          const { data, error } = await remoteSupabase
            .from("products_resources")
            .update({
              ...record,
              updated_at: new Date().toISOString(),
            })
            .eq("resource_id", existing.resource_id)
            .select()
            .single();

          if (error) {
            console.error("[upsert-update] Error:", error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          console.log(`[upsert] Updated resource_id=${data.resource_id}`);
          return new Response(JSON.stringify({ success: true, data, action: "updated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // Insert
          const { data, error } = await remoteSupabase
            .from("products_resources")
            .insert(record)
            .select()
            .single();

          if (error) {
            console.error("[upsert-insert] Error:", error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Update local resource counts
          if (record.articol_id) {
            await updateLocalResourceCounts(localSupabase, remoteSupabase, record.articol_id);
          }

          console.log(`[upsert] Inserted resource_id=${data.resource_id}`);
          return new Response(JSON.stringify({ success: true, data, action: "inserted" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      case "delete": {
        const { resource_id, filters, articol_id } = body as { 
          resource_id?: number;
          articol_id?: number;
          filters?: { erp_product_code?: string; language?: string; resource_type?: string };
        };

        // Get articol_id before delete if not provided
        let targetArticolId = articol_id;
        if (!targetArticolId && resource_id) {
          const { data: resourceData } = await remoteSupabase
            .from("products_resources")
            .select("articol_id")
            .eq("resource_id", resource_id)
            .single();
          targetArticolId = resourceData?.articol_id;
        }

        let query = remoteSupabase.from("products_resources").delete();

        if (resource_id) {
          query = query.eq("resource_id", resource_id);
        }
        if (filters?.erp_product_code) {
          query = query.eq("erp_product_code", filters.erp_product_code);
        }
        if (filters?.language) {
          query = query.eq("language", filters.language);
        }
        if (filters?.resource_type) {
          query = query.eq("resource_type", filters.resource_type);
        }

        const { error } = await query;

        if (error) {
          console.error("[delete] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update local resource counts
        if (targetArticolId) {
          await updateLocalResourceCounts(localSupabase, remoteSupabase, targetArticolId);
        }

        console.log(`[delete] Deleted resource`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_counts": {
        // Sync resource counts for specific products
        const { articol_ids } = body as { articol_ids?: number[] };

        if (!articol_ids || articol_ids.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "No articol_ids provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let updated = 0;
        for (const articolId of articol_ids) {
          await updateLocalResourceCounts(localSupabase, remoteSupabase, articolId);
          updated++;
        }

        console.log(`[sync_counts] Synced ${updated} products`);
        return new Response(JSON.stringify({ success: true, updated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_all_counts": {
        // Sync ALL resource counts (total and unprocessed) from remote to local
        console.log(`[sync_all_counts] Starting bulk sync`);

        try {
          // Paginate through all resources to avoid 1000 row limit
          const pageSize = 1000;
          let allResources: { articol_id: number; processed: boolean | null }[] = [];
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const { data: pageData, error: pageError } = await remoteSupabase
              .from("products_resources")
              .select("articol_id, processed")
              .not("articol_id", "is", null)
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (pageError) {
              console.error("[sync_all_counts] Page error:", pageError);
              return new Response(JSON.stringify({ success: false, error: pageError.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            if (pageData && pageData.length > 0) {
              allResources = allResources.concat(pageData);
              console.log(`[sync_all_counts] Fetched page ${page + 1}: ${pageData.length} records (total: ${allResources.length})`);
              hasMore = pageData.length === pageSize;
              page++;
            } else {
              hasMore = false;
            }
          }

          // Count total and unprocessed resources per articol_id
          const countsMap: Record<number, { total: number; unprocessed: number }> = {};
          for (const r of allResources) {
            if (r.articol_id) {
              if (!countsMap[r.articol_id]) {
                countsMap[r.articol_id] = { total: 0, unprocessed: 0 };
              }
              countsMap[r.articol_id].total++;
              // Count as unprocessed if processed is null or false
              if (r.processed === null || r.processed === false) {
                countsMap[r.articol_id].unprocessed++;
              }
            }
          }

          const articolIds = Object.keys(countsMap).map(Number);
          console.log(`[sync_all_counts] Found ${articolIds.length} products with resources, total ${allResources.length} resource records`);

          // Update products with resources in parallel batches
          let updated = 0;
          let errors = 0;
          const batchSize = 100;
          
          for (let i = 0; i < articolIds.length; i += batchSize) {
            const batch = articolIds.slice(i, i + batchSize);
            
            // Execute batch updates in parallel
            const results = await Promise.allSettled(
              batch.map(articolId => 
                localSupabase
                  .from("products")
                  .update({ 
                    resource_count: countsMap[articolId].total,
                    resource_unprocessed_count: countsMap[articolId].unprocessed
                  })
                  .eq("articol_id", articolId)
              )
            );

            results.forEach((result) => {
              if (result.status === "fulfilled" && !result.value.error) {
                updated++;
              } else {
                errors++;
              }
            });

            console.log(`[sync_all_counts] Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} processed`);
          }

          // Reset counts to 0 for products without resources
          const { error: zeroError } = await localSupabase
            .from("products")
            .update({ resource_count: 0, resource_unprocessed_count: 0 })
            .or(articolIds.length > 0 
              ? `articol_id.not.in.(${articolIds.join(",")})` 
              : "articol_id.not.is.null"
            )
            .gt("resource_count", 0);

          if (zeroError) {
            console.error("[sync_all_counts] Zero update error:", zeroError);
          }

          console.log(`[sync_all_counts] Completed: ${updated} updated, ${errors} errors`);
          return new Response(JSON.stringify({ 
            success: true, 
            updated, 
            errors,
            total_resources: allResources.length,
            products_with_resources: articolIds.length 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[sync_all_counts] Unexpected error:", err);
          return new Response(JSON.stringify({ success: false, error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("[remote-resources] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
