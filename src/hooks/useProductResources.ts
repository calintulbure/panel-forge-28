import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductResource {
  articol_id: number;
  url: string | null;
  resource_snapshot: string | null;
  server: string;
}

export interface ProductResourcesMap {
  [articolId: number]: {
    ro?: ProductResource;
    hu?: ProductResource;
  };
}

export function useProductResources() {
  const [resources, setResources] = useState<ProductResourcesMap>({});
  const [loading, setLoading] = useState(false);

  const fetchResourcesForProducts = useCallback(async (articolIds: number[]) => {
    if (articolIds.length === 0) return;

    setLoading(true);
    try {
      // Fetch from remote via edge function
      const { data: response, error } = await supabase.functions.invoke("remote-resources", {
        body: {
          action: "get",
          filters: {
            resource_type: "html",
            resource_content: "webpage",
            server: ["yli.ro", "yli.hu"]
          }
        }
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || "Failed to fetch resources");

      const data = response.data || [];
      const resourcesMap: ProductResourcesMap = {};
      
      data.forEach((resource: any) => {
        if (!resource.articol_id || !articolIds.includes(resource.articol_id)) return;
        
        if (!resourcesMap[resource.articol_id]) {
          resourcesMap[resource.articol_id] = {};
        }
        
        if (resource.server === "yli.ro") {
          resourcesMap[resource.articol_id].ro = resource as ProductResource;
        } else if (resource.server === "yli.hu") {
          resourcesMap[resource.articol_id].hu = resource as ProductResource;
        }
      });

      setResources(resourcesMap);
    } catch (error) {
      console.error("Error fetching product resources:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResourceForProduct = useCallback(async (articolId: number) => {
    try {
      // Fetch from remote via edge function
      const { data: response, error } = await supabase.functions.invoke("remote-resources", {
        body: {
          action: "get",
          articol_id: articolId,
          filters: {
            resource_type: "html",
            resource_content: "webpage",
            server: ["yli.ro", "yli.hu"]
          }
        }
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || "Failed to fetch resources");

      const data = response.data || [];
      const result: { ro?: ProductResource; hu?: ProductResource } = {};
      
      data.forEach((resource: any) => {
        if (resource.server === "yli.ro") {
          result.ro = resource as ProductResource;
        } else if (resource.server === "yli.hu") {
          result.hu = resource as ProductResource;
        }
      });

      return result;
    } catch (error) {
      console.error("Error fetching product resource:", error);
      return { ro: undefined, hu: undefined };
    }
  }, []);

  return {
    resources,
    loading,
    fetchResourcesForProducts,
    fetchResourceForProduct,
  };
}
