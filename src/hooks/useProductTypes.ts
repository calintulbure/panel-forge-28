import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProductType {
  id: number;
  denumire: string;
}

export function useProductTypes() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTypes = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;

      const { data, error } = await supabase.functions.invoke("remote-tip-produs", {
        method: "GET",
        body: undefined,
      });

      // Workaround: supabase.functions.invoke doesn't support GET with query params well
      // So we use fetch directly
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`);
      if (search) url.searchParams.set("search", search);

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

      setTypes(result.data || []);
      return result.data || [];
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

  const createType = useCallback(async (denumire: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("remote-tip-produs", {
        method: "POST",
        body: { denumire },
      });

      // Use fetch for proper action param
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`);
      url.searchParams.set("action", "create-type");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ denumire }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: `Created product type: ${denumire}`,
      });

      // Refresh the list
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

  const updateType = useCallback(async (id: number, denumire: string) => {
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`);

      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ id, denumire }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: `Updated product type: ${denumire}`,
      });

      // Refresh the list
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
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`);
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

  const deleteType = useCallback(async (id: number) => {
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remote-tip-produs`);
      url.searchParams.set("id", id.toString());

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

      // Refresh the list
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
