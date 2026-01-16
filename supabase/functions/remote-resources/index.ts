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

// Helper function to update resource_count in local products table
async function updateLocalResourceCount(
  localSupabase: any,
  remoteSupabase: any,
  articolId: number
): Promise<void> {
  try {
    // Count resources on remote
    const { count, error: countError } = await remoteSupabase
      .from("products_resources")
      .select("*", { count: "exact", head: true })
      .eq("articol_id", articolId);

    if (countError) {
      console.error("[updateLocalResourceCount] Count error:", countError);
      return;
    }

    // Update local products table
    const { error: updateError } = await localSupabase
      .from("products")
      .update({ resource_count: count || 0 })
      .eq("articol_id", articolId);

    if (updateError) {
      console.error("[updateLocalResourceCount] Update error:", updateError);
      return;
    }

    console.log(`[updateLocalResourceCount] Updated articol_id=${articolId} to count=${count}`);
  } catch (error) {
    console.error("[updateLocalResourceCount] Error:", error);
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

        // Update local resource_count
        if (record.articol_id) {
          await updateLocalResourceCount(localSupabase, remoteSupabase, record.articol_id);
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

          // Update local resource_count
          if (record.articol_id) {
            await updateLocalResourceCount(localSupabase, remoteSupabase, record.articol_id);
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

        // Update local resource_count
        if (targetArticolId) {
          await updateLocalResourceCount(localSupabase, remoteSupabase, targetArticolId);
        }

        console.log(`[delete] Deleted resource`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_counts": {
        // Sync all resource counts for products
        const { articol_ids } = body as { articol_ids?: number[] };

        if (!articol_ids || articol_ids.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "No articol_ids provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let updated = 0;
        for (const articolId of articol_ids) {
          await updateLocalResourceCount(localSupabase, remoteSupabase, articolId);
          updated++;
        }

        console.log(`[sync_counts] Synced ${updated} products`);
        return new Response(JSON.stringify({ success: true, updated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
