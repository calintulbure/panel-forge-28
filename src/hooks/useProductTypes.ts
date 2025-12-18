import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface ProductType {
  tipprodus_id: number;
  tipprodus_cod: string;
  tipprodus_descriere: string;
  tipprodus_level: string;
  tipprodusmain_id: number | null;
  tipprodusmain_descr: string | null;
  countproduse: number | null;
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`;

export function useProductTypes() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTypes = useCallback(async (search?: string, level?: string, mainId?: number) => {
    setLoading(true);
    try {
      const url = new URL(API_BASE);
      if (search) url.searchParams.set("search", search);
      if (level) url.searchParams.set("level", level);
      if (mainId) url.searchParams.set("mainId", mainId.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      const normalized: ProductType[] = (result.data || []).map((t: ProductType) => ({
        ...t,
        tipprodus_level: (t.tipprodus_level || "").toLowerCase(),
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

  const createType = useCallback(async (
    tipprodus_descriere: string, 
    tipprodus_level: string = "main",
    tipprodusmain_id?: number,
    tipprodusmain_descr?: string
  ) => {
    try {
      const url = new URL(API_BASE);
      url.searchParams.set("action", "create-type");

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

  const updateType = useCallback(async (
    tipprodus_id: number, 
    tipprodus_descriere: string,
    tipprodus_level?: string,
    tipprodusmain_id?: number | null,
    tipprodusmain_descr?: string | null
  ) => {
    try {
      const response = await fetch(API_BASE, {
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

  const updateProductType = useCallback(async (erp_product_code: string, tip_produs_id: number | null) => {
    try {
      const url = new URL(API_BASE);
      url.searchParams.set("action", "update-product");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ erp_product_code, tip_produs_id }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

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
  }, [toast]);

  const deleteType = useCallback(async (tipprodus_id: number) => {
    try {
      const url = new URL(API_BASE);
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

  return {
    types,
    loading,
    fetchTypes,
    createType,
    updateType,
    updateProductType,
    deleteType,
  };
}
