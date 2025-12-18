import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ProductType {
  tipprodus_id: number;
  tipprodus_cod?: string | null;
  tipprodus_descriere: string;
  tipprodus_level: string;
  tipprodusmain_id: number | null;
  tipprodusmain_descr?: string | null;
  countproduse: number;
}

const SYNC_API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-tip-produs`;

export function useProductTypes() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch from local table with dynamic product count
  const fetchTypes = useCallback(async (search?: string, level?: string, mainId?: number) => {
    setLoading(true);
    try {
      // Fetch types
      let query = supabase
        .from("tip_produs")
        .select("tipprodus_id, tipprodus_cod, tipprodus_descriere, tipprodus_level, tipprodusmain_id, tipprodusmain_descr")
        .order("tipprodus_descriere", { ascending: true })
        .limit(500);

      if (search) {
        query = query.ilike("tipprodus_descriere", `%${search}%`);
      }

      if (level) {
        query = query.ilike("tipprodus_level", level);
      }

      if (mainId) {
        query = query.eq("tipprodusmain_id", mainId);
      }

      const { data: typesData, error: typesError } = await query;

      if (typesError) {
        throw typesError;
      }

      // Fetch product counts using RPC function (avoids 1000 row limit)
      const { data: countData, error: countError } = await supabase
        .rpc("get_product_type_counts");

      if (countError) {
        console.warn("Failed to fetch product counts:", countError);
      }

      // Build count map from RPC result
      const countMap = new Map<number, number>();
      if (countData) {
        for (const row of countData) {
          if (row.tip_produs_id_sub != null) {
            countMap.set(row.tip_produs_id_sub, Number(row.product_count) || 0);
          }
        }
      }

      const normalized: ProductType[] = (typesData || []).map((t) => ({
        tipprodus_id: t.tipprodus_id,
        tipprodus_cod: t.tipprodus_cod,
        tipprodus_descriere: t.tipprodus_descriere,
        tipprodus_level: (t.tipprodus_level || "").toLowerCase(),
        tipprodusmain_id: t.tipprodusmain_id,
        tipprodusmain_descr: t.tipprodusmain_descr,
        countproduse: countMap.get(t.tipprodus_id) || 0,
      }));

      setTypes(normalized);
      return normalized;
    } catch (err) {
      console.error("Error fetching product types:", err);
      toast({
        title: "Error",
        description: "Failed to load product types",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create via sync edge function (creates in both local and remote)
  const createType = useCallback(async (
    tipprodus_descriere: string, 
    tipprodus_level: string = "Main",
    tipprodusmain_id?: number,
    tipprodusmain_descr?: string
  ) => {
    try {
      const url = new URL(SYNC_API_BASE);
      url.searchParams.set("action", "sync-create");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          tipprodus_descriere, 
          tipprodus_level,
          tipprodusmain_id,
          tipprodusmain_descr
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: `Created product type: ${tipprodus_descriere}`,
      });

      await fetchTypes();
      return result.data;
    } catch (err) {
      console.error("Error creating product type:", err);
      toast({
        title: "Error",
        description: "Failed to create product type",
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchTypes]);

  // Update via sync edge function (updates both local and remote)
  const updateType = useCallback(async (
    tipprodus_id: number, 
    tipprodus_descriere: string,
    tipprodus_level?: string,
    tipprodusmain_id?: number | null,
    tipprodusmain_descr?: string | null
  ) => {
    try {
      const response = await fetch(SYNC_API_BASE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          tipprodus_id, 
          tipprodus_descriere,
          tipprodus_level,
          tipprodusmain_id,
          tipprodusmain_descr
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: `Updated product type: ${tipprodus_descriere}`,
      });

      await fetchTypes();
      return result.data;
    } catch (err) {
      console.error("Error updating product type:", err);
      toast({
        title: "Error",
        description: "Failed to update product type",
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchTypes]);

  // Update product's tip_produs_id_sub (local only, synced via bulk-upsert)
  const updateProductType = useCallback(async (erp_product_code: string, tip_produs_id_sub: number | null) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ tip_produs_id_sub })
        .eq("erp_product_code", erp_product_code)
        .select("erp_product_code, tip_produs_id_sub")
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Error updating product type:", err);
      toast({
        title: "Error",
        description: "Failed to update product type",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Delete via sync edge function (deletes from both local and remote)
  const deleteType = useCallback(async (tipprodus_id: number) => {
    try {
      const url = new URL(SYNC_API_BASE);
      url.searchParams.set("id", tipprodus_id.toString());

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Product type deleted",
      });

      await fetchTypes();
      return true;
    } catch (err) {
      console.error("Error deleting product type:", err);
      toast({
        title: "Error",
        description: "Failed to delete product type",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchTypes]);

  // Import all types from remote to local (one-time)
  const importFromRemote = useCallback(async () => {
    try {
      const url = new URL(SYNC_API_BASE);
      url.searchParams.set("action", "import");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: `Imported ${result.imported} product types from remote`,
      });

      await fetchTypes();
      return result.imported;
    } catch (err) {
      console.error("Error importing product types:", err);
      toast({
        title: "Error",
        description: "Failed to import product types",
        variant: "destructive",
      });
      return 0;
    }
  }, [toast, fetchTypes]);

  return {
    types,
    loading,
    fetchTypes,
    createType,
    updateType,
    updateProductType,
    deleteType,
    importFromRemote,
  };
}
