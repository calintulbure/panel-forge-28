import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueRecord {
  queue_id?: number;
  entity_type: 'resource' | 'document';
  entity_id: number;
  erp_product_code?: string | null;
  articol_id?: number | null;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority?: number;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  processing_log?: string | null;
  error_message?: string | null;
  n8n_workflow_id?: string | null;
  metadata?: Record<string, any>;
  updated_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`[processing-queue] Action: ${action}`);

    switch (action) {
      case "list": {
        const { filters, limit = 100, offset = 0 } = body;
        
        let query = localSupabase
          .from("processing_queue")
          .select("*", { count: "exact" });

        if (filters?.entity_type) {
          query = query.eq("entity_type", filters.entity_type);
        }
        if (filters?.status) {
          if (Array.isArray(filters.status)) {
            query = query.in("status", filters.status);
          } else {
            query = query.eq("status", filters.status);
          }
        }
        if (filters?.erp_product_code) {
          query = query.ilike("erp_product_code", `%${filters.erp_product_code}%`);
        }
        if (filters?.articol_id) {
          query = query.eq("articol_id", filters.articol_id);
        }

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

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

      case "enqueue": {
        const { records } = body as { records: QueueRecord[] };

        if (!records || records.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "No records provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert into local queue
        const { data: localData, error: localError } = await localSupabase
          .from("processing_queue")
          .insert(records)
          .select();

        if (localError) {
          console.error("[enqueue] Local insert error:", localError);
          return new Response(JSON.stringify({ success: false, error: localError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sync to remote
        const { error: remoteError } = await remoteSupabase
          .from("processing_queue")
          .upsert(localData, { onConflict: "queue_id" });

        if (remoteError) {
          console.warn("[enqueue] Remote sync warning:", remoteError);
        }

        console.log(`[enqueue] Added ${localData.length} items to queue`);
        return new Response(JSON.stringify({ success: true, data: localData, count: localData.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_status": {
        const { queue_id, queue_ids, status, processing_log, error_message, n8n_workflow_id } = body;

        const ids = queue_ids || (queue_id ? [queue_id] : []);
        if (ids.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "No queue_id(s) provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updatePayload: Partial<QueueRecord> = { status };
        
        if (status === 'processing') {
          updatePayload.started_at = new Date().toISOString();
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          updatePayload.completed_at = new Date().toISOString();
        }
        if (processing_log) {
          updatePayload.processing_log = processing_log;
        }
        if (error_message) {
          updatePayload.error_message = error_message;
        }
        if (n8n_workflow_id) {
          updatePayload.n8n_workflow_id = n8n_workflow_id;
        }

        // Update local
        const { data, error } = await localSupabase
          .from("processing_queue")
          .update(updatePayload)
          .in("queue_id", ids)
          .select();

        if (error) {
          console.error("[update_status] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sync to remote
        if (data && data.length > 0) {
          const { error: remoteError } = await remoteSupabase
            .from("processing_queue")
            .upsert(data, { onConflict: "queue_id" });

          if (remoteError) {
            console.warn("[update_status] Remote sync warning:", remoteError);
          }
        }

        console.log(`[update_status] Updated ${data?.length || 0} items to status=${status}`);
        return new Response(JSON.stringify({ success: true, data, updated: data?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { queue_id, queue_ids, filters } = body;

        const ids = queue_ids || (queue_id ? [queue_id] : []);

        // Delete from local
        let query = localSupabase.from("processing_queue").delete();
        
        if (ids.length > 0) {
          query = query.in("queue_id", ids);
        }
        if (filters?.status) {
          query = query.eq("status", filters.status);
        }
        if (filters?.entity_type) {
          query = query.eq("entity_type", filters.entity_type);
        }

        const { error } = await query;

        if (error) {
          console.error("[delete] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete from remote
        let remoteQuery = remoteSupabase.from("processing_queue").delete();
        if (ids.length > 0) {
          remoteQuery = remoteQuery.in("queue_id", ids);
        }
        if (filters?.status) {
          remoteQuery = remoteQuery.eq("status", filters.status);
        }
        if (filters?.entity_type) {
          remoteQuery = remoteQuery.eq("entity_type", filters.entity_type);
        }

        const { error: remoteError } = await remoteQuery;
        if (remoteError) {
          console.warn("[delete] Remote delete warning:", remoteError);
        }

        console.log(`[delete] Deleted queue items`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_to_remote": {
        // Bulk sync all local queue items to remote
        const { data: localItems, error: fetchError } = await localSupabase
          .from("processing_queue")
          .select("*");

        if (fetchError) {
          console.error("[sync_to_remote] Fetch error:", fetchError);
          return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!localItems || localItems.length === 0) {
          return new Response(JSON.stringify({ success: true, synced: 0, message: "No items to sync" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: upsertError } = await remoteSupabase
          .from("processing_queue")
          .upsert(localItems, { onConflict: "queue_id" });

        if (upsertError) {
          console.error("[sync_to_remote] Upsert error:", upsertError);
          return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[sync_to_remote] Synced ${localItems.length} items to remote`);
        return new Response(JSON.stringify({ success: true, synced: localItems.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_from_remote": {
        // Sync remote queue status back to local (useful for n8n callback updates)
        const { queue_ids } = body as { queue_ids?: number[] };

        let query = remoteSupabase.from("processing_queue").select("*");
        
        if (queue_ids && queue_ids.length > 0) {
          query = query.in("queue_id", queue_ids);
        }

        const { data: remoteItems, error: fetchError } = await query;

        if (fetchError) {
          console.error("[sync_from_remote] Fetch error:", fetchError);
          return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!remoteItems || remoteItems.length === 0) {
          return new Response(JSON.stringify({ success: true, synced: 0, message: "No items to sync" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: upsertError } = await localSupabase
          .from("processing_queue")
          .upsert(remoteItems, { onConflict: "queue_id" });

        if (upsertError) {
          console.error("[sync_from_remote] Upsert error:", upsertError);
          return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[sync_from_remote] Synced ${remoteItems.length} items from remote`);
        return new Response(JSON.stringify({ success: true, synced: remoteItems.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "stats": {
        // Get queue statistics
        const { data: stats, error } = await localSupabase
          .from("processing_queue")
          .select("entity_type, status");

        if (error) {
          console.error("[stats] Error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const summary = {
          total: stats?.length || 0,
          by_entity_type: {
            resource: stats?.filter(s => s.entity_type === 'resource').length || 0,
            document: stats?.filter(s => s.entity_type === 'document').length || 0,
          },
          by_status: {
            pending: stats?.filter(s => s.status === 'pending').length || 0,
            processing: stats?.filter(s => s.status === 'processing').length || 0,
            completed: stats?.filter(s => s.status === 'completed').length || 0,
            failed: stats?.filter(s => s.status === 'failed').length || 0,
            cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
          }
        };

        return new Response(JSON.stringify({ success: true, stats: summary }), {
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
    console.error("[processing-queue] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
