import { supabase } from "@/integrations/supabase/client";

export interface RemoteResource {
  resource_id: number;
  articol_id?: number | null;
  erp_product_code?: string | null;
  resource_type: string;
  resource_content?: string | null;
  url?: string | null;
  server?: string | null;
  language?: string | null;
  title?: string | null;
  description?: string | null;
  url_status?: string | null;
  processed?: boolean | null;
  created_at?: string | null;
  resource_snapshot?: string | null;
}

interface ListFilters {
  resource_type?: string;
  resource_content?: string;
  server?: string | string[];
  language?: string;
  erp_product_code?: string;
}

interface UpsertMatchOn {
  erp_product_code?: string;
  language?: string;
  resource_type?: string;
}

export async function listRemoteResources(
  articolId: number,
  filters?: ListFilters
): Promise<{ success: boolean; data?: RemoteResource[]; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "list",
        articol_id: articolId,
        filters,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error listing remote resources:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function countRemoteResources(
  articolId: number
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "count",
        articol_id: articolId,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error counting remote resources:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function insertRemoteResource(
  record: Partial<RemoteResource>
): Promise<{ success: boolean; data?: RemoteResource; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "insert",
        record,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error inserting remote resource:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateRemoteResource(
  resourceId: number,
  record: Partial<RemoteResource>
): Promise<{ success: boolean; data?: RemoteResource; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "update",
        resource_id: resourceId,
        record,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error updating remote resource:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function upsertRemoteResource(
  record: Partial<RemoteResource>,
  matchOn: UpsertMatchOn
): Promise<{ success: boolean; data?: RemoteResource; action?: string; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "upsert",
        record,
        match_on: matchOn,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error upserting remote resource:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteRemoteResource(
  resourceId?: number,
  filters?: { erp_product_code?: string; language?: string; resource_type?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("remote-resources", {
      body: {
        action: "delete",
        resource_id: resourceId,
        filters,
      },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error deleting remote resource:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
