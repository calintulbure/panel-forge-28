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
      const { data, error } = await supabase
        .from("products_resources")
        .select("articol_id, url, resource_snapshot, server")
        .in("articol_id", articolIds)
        .eq("resource_type", "html")
        .eq("resource_content", "webpage")
        .in("server", ["yli.ro", "yli.hu"]);

      if (error) throw error;

      const resourcesMap: ProductResourcesMap = {};
      
      data?.forEach((resource) => {
        if (!resource.articol_id) return;
        
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
      const { data, error } = await supabase
        .from("products_resources")
        .select("articol_id, url, resource_snapshot, server")
        .eq("articol_id", articolId)
        .eq("resource_type", "html")
        .eq("resource_content", "webpage")
        .in("server", ["yli.ro", "yli.hu"]);

      if (error) throw error;

      const result: { ro?: ProductResource; hu?: ProductResource } = {};
      
      data?.forEach((resource) => {
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
