import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductImport } from "@/components/products/ProductImport";
import { ProductAddForm } from "@/components/products/ProductAddForm";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useProductTypes, ProductType } from "@/hooks/useProductTypes";

export default function Products() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL or defaults
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category1, setCategory1] = useState<string[]>(
    searchParams.get("cat1")?.split(",").filter(Boolean) || []
  );
  const [category2, setCategory2] = useState<string[]>(
    searchParams.get("cat2")?.split(",").filter(Boolean) || []
  );
  const [category3, setCategory3] = useState<string[]>(
    searchParams.get("cat3")?.split(",").filter(Boolean) || []
  );
  const [offerStatus, setOfferStatus] = useState<string[]>(
    searchParams.get("offer")?.split(",").filter(Boolean) || []
  );
  const [offerStatusSecondary, setOfferStatusSecondary] = useState<string[]>(
    searchParams.get("offer2")?.split(",").filter(Boolean) || []
  );
  const [stockStatus, setStockStatus] = useState<string[]>(
    searchParams.get("stock")?.split(",").filter(Boolean) || []
  );
  const [validationFilter, setValidationFilter] = useState(
    searchParams.get("validation") || "all"
  );
  const [yliRoSkuFilter, setYliRoSkuFilter] = useState(
    searchParams.get("roSku") || "all"
  );
  const [yliHuSkuFilter, setYliHuSkuFilter] = useState(
    searchParams.get("huSku") || "all"
  );
  const [yliRoProdIdFilter, setYliRoProdIdFilter] = useState(
    searchParams.get("roProdId") || "all"
  );
  const [yliHuProdIdFilter, setYliHuProdIdFilter] = useState(
    searchParams.get("huProdId") || "all"
  );
  const [tipProdusFilter, setTipProdusFilter] = useState(
    searchParams.get("tipProdus") || "all"
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Fetch product types for the filter
  const { types: productTypes, fetchTypes } = useProductTypes();
  
  useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category1.length > 0) params.set("cat1", category1.join(","));
    if (category2.length > 0) params.set("cat2", category2.join(","));
    if (category3.length > 0) params.set("cat3", category3.join(","));
    if (offerStatus.length > 0) params.set("offer", offerStatus.join(","));
    if (offerStatusSecondary.length > 0) params.set("offer2", offerStatusSecondary.join(","));
    if (stockStatus.length > 0) params.set("stock", stockStatus.join(","));
    if (validationFilter !== "all") params.set("validation", validationFilter);
    if (yliRoSkuFilter !== "all") params.set("roSku", yliRoSkuFilter);
    if (yliHuSkuFilter !== "all") params.set("huSku", yliHuSkuFilter);
    if (yliRoProdIdFilter !== "all") params.set("roProdId", yliRoProdIdFilter);
    if (yliHuProdIdFilter !== "all") params.set("huProdId", yliHuProdIdFilter);
    if (tipProdusFilter !== "all") params.set("tipProdus", tipProdusFilter);
    
    setSearchParams(params, { replace: true });
  }, [search, category1, category2, category3, offerStatus, offerStatusSecondary, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter, yliRoProdIdFilter, yliHuProdIdFilter, tipProdusFilter]);

  // Fetch filter options (categories and statuses)
  const { data: filterOptions } = useQuery({
    queryKey: ["products-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("categ1,categ2,categ3,stare_oferta,stare_oferta_secundara,stare_stoc");

      if (error) throw error;

      const categ1Set = new Set<string>();
      const categ2Set = new Set<string>();
      const categ3Set = new Set<string>();
      const offerSet = new Set<string>();
      const offerSecondarySet = new Set<string>();
      const stockSet = new Set<string>();
      const offerRelationMap = new Map<string, Set<string>>();
      const categ1To2Map = new Map<string, Set<string>>();
      const categ1And2To3Map = new Map<string, Set<string>>();

      data?.forEach((p) => {
        if (p.categ1) {
          categ1Set.add(p.categ1);
          
          // Build categ1 -> categ2 relationship
          if (p.categ2) {
            if (!categ1To2Map.has(p.categ1)) {
              categ1To2Map.set(p.categ1, new Set<string>());
            }
            categ1To2Map.get(p.categ1)!.add(p.categ2);
            
            // Build categ1+categ2 -> categ3 relationship
            if (p.categ3) {
              const key = `${p.categ1}|${p.categ2}`;
              if (!categ1And2To3Map.has(key)) {
                categ1And2To3Map.set(key, new Set<string>());
              }
              categ1And2To3Map.get(key)!.add(p.categ3);
            }
          }
        }
        
        if (p.categ2) categ2Set.add(p.categ2);
        if (p.categ3) categ3Set.add(p.categ3);
        
        if (p.stare_oferta) {
          offerSet.add(p.stare_oferta);
          // Build offer relationship map
          if (!offerRelationMap.has(p.stare_oferta)) {
            offerRelationMap.set(p.stare_oferta, new Set<string>());
          }
          if (p.stare_oferta_secundara) {
            offerRelationMap.get(p.stare_oferta)!.add(p.stare_oferta_secundara);
          }
        }
        if (p.stare_oferta_secundara) offerSecondarySet.add(p.stare_oferta_secundara);
        if (p.stare_stoc) stockSet.add(p.stare_stoc);
      });

      // Convert maps to objects with sorted arrays
      const offerRelations: Record<string, string[]> = {};
      offerRelationMap.forEach((secondaries, primary) => {
        offerRelations[primary] = Array.from(secondaries).sort();
      });

      const categ1To2: Record<string, string[]> = {};
      categ1To2Map.forEach((categ2s, categ1) => {
        categ1To2[categ1] = Array.from(categ2s).sort();
      });

      const categ1And2To3: Record<string, string[]> = {};
      categ1And2To3Map.forEach((categ3s, key) => {
        categ1And2To3[key] = Array.from(categ3s).sort();
      });

      return {
        categ1: Array.from(categ1Set).sort(),
        categ2: Array.from(categ2Set).sort(),
        categ3: Array.from(categ3Set).sort(),
        offerStatuses: Array.from(offerSet).sort(),
        offerStatusesSecondary: Array.from(offerSecondarySet).sort(),
        stockStatuses: Array.from(stockSet).sort(),
        offerRelations,
        categ1To2,
        categ1And2To3,
      };
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch total count with filters
  const { data: totalCount } = useQuery({
    queryKey: ["products-count", search, category1, category2, category3, offerStatus, offerStatusSecondary, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter, yliRoProdIdFilter, yliHuProdIdFilter, tipProdusFilter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Apply filters
      if (search) {
        query = query.or(`erp_product_code.ilike.%${search}%,erp_product_description.ilike.%${search}%`);
      }
      if (category1.length > 0) {
        query = query.in("categ1", category1);
      }
      if (category2.length > 0) {
        query = query.in("categ2", category2);
      }
      if (category3.length > 0) {
        query = query.in("categ3", category3);
      }
      if (offerStatus.length > 0) {
        query = query.in("stare_oferta", offerStatus);
      }
      if (offerStatusSecondary.length > 0) {
        query = query.in("stare_oferta_secundara", offerStatusSecondary);
      }
      if (stockStatus.length > 0) {
        query = query.in("stare_stoc", stockStatus);
      }
      if (validationFilter === "validated") {
        query = query.eq("validated", true);
      } else if (validationFilter === "not_validated") {
        query = query.or("validated.is.null,validated.eq.false");
      }
      if (yliRoSkuFilter === "blank") {
        query = query.is("yliro_sku", null);
      } else if (yliRoSkuFilter === "not_blank") {
        query = query.not("yliro_sku", "is", null);
      }
      if (yliHuSkuFilter === "blank") {
        query = query.is("ylihu_sku", null);
      } else if (yliHuSkuFilter === "not_blank") {
        query = query.not("ylihu_sku", "is", null);
      }
      if (yliRoProdIdFilter !== "all") {
        if (yliRoProdIdFilter === "null") {
          query = query.is("site_ro_product_id", null);
        } else if (yliRoProdIdFilter === "0") {
          query = query.eq("site_ro_product_id", 0);
        } else if (yliRoProdIdFilter === ">0") {
          query = query.gt("site_ro_product_id", 0);
        }
      }
      if (yliHuProdIdFilter !== "all") {
        if (yliHuProdIdFilter === "null") {
          query = query.is("site_hu_product_id", null);
        } else if (yliHuProdIdFilter === "0") {
          query = query.eq("site_hu_product_id", 0);
        } else if (yliHuProdIdFilter === ">0") {
          query = query.gt("site_hu_product_id", 0);
        }
      }
      if (tipProdusFilter !== "all") {
        if (tipProdusFilter === "null") {
          query = query.is("tip_produs_id_sub", null);
        } else {
          query = query.eq("tip_produs_id_sub", parseInt(tipProdusFilter));
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch paginated products with filters
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products", currentPage, itemsPerPage, search, category1, category2, category3, offerStatus, offerStatusSecondary, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter, yliRoProdIdFilter, yliHuProdIdFilter, tipProdusFilter],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("products")
        .select("*")
        .order("erp_product_code", { ascending: true })
        .range(from, to);

      // Apply filters
      if (search) {
        query = query.or(`erp_product_code.ilike.%${search}%,erp_product_description.ilike.%${search}%`);
      }
      if (category1.length > 0) {
        query = query.in("categ1", category1);
      }
      if (category2.length > 0) {
        query = query.in("categ2", category2);
      }
      if (category3.length > 0) {
        query = query.in("categ3", category3);
      }
      if (offerStatus.length > 0) {
        query = query.in("stare_oferta", offerStatus);
      }
      if (offerStatusSecondary.length > 0) {
        query = query.in("stare_oferta_secundara", offerStatusSecondary);
      }
      if (stockStatus.length > 0) {
        query = query.in("stare_stoc", stockStatus);
      }
      if (validationFilter === "validated") {
        query = query.eq("validated", true);
      } else if (validationFilter === "not_validated") {
        query = query.or("validated.is.null,validated.eq.false");
      }
      if (yliRoSkuFilter === "blank") {
        query = query.is("yliro_sku", null);
      } else if (yliRoSkuFilter === "not_blank") {
        query = query.not("yliro_sku", "is", null);
      }
      if (yliHuSkuFilter === "blank") {
        query = query.is("ylihu_sku", null);
      } else if (yliHuSkuFilter === "not_blank") {
        query = query.not("ylihu_sku", "is", null);
      }
      if (yliRoProdIdFilter !== "all") {
        if (yliRoProdIdFilter === "null") {
          query = query.is("site_ro_product_id", null);
        } else if (yliRoProdIdFilter === "0") {
          query = query.eq("site_ro_product_id", 0);
        } else if (yliRoProdIdFilter === ">0") {
          query = query.gt("site_ro_product_id", 0);
        }
      }
      if (yliHuProdIdFilter !== "all") {
        if (yliHuProdIdFilter === "null") {
          query = query.is("site_hu_product_id", null);
        } else if (yliHuProdIdFilter === "0") {
          query = query.eq("site_hu_product_id", 0);
        } else if (yliHuProdIdFilter === ">0") {
          query = query.gt("site_hu_product_id", 0);
        }
      }
      if (tipProdusFilter !== "all") {
        if (tipProdusFilter === "null") {
          query = query.is("tip_produs_id_sub", null);
        } else {
          query = query.eq("tip_produs_id_sub", parseInt(tipProdusFilter));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const categories = useMemo(() => {
    return filterOptions || { 
      categ1: [], 
      categ2: [], 
      categ3: [], 
      offerStatuses: [], 
      offerStatusesSecondary: [], 
      stockStatuses: [], 
      offerRelations: {},
      categ1To2: {},
      categ1And2To3: {}
    };
  }, [filterOptions]);

  // Filter category2 based on selected category1
  const availableCateg2 = useMemo(() => {
    if (category1.length === 0) {
      return categories.categ2;
    }
    
    const categ2Set = new Set<string>();
    category1.forEach(c1 => {
      const categ2s = categories.categ1To2[c1] || [];
      categ2s.forEach(c2 => categ2Set.add(c2));
    });
    
    return Array.from(categ2Set).sort();
  }, [category1, categories.categ2, categories.categ1To2]);

  // Filter category3 based on selected category1 and category2
  const availableCateg3 = useMemo(() => {
    if (category1.length === 0) {
      return categories.categ3;
    }
    
    const categ3Set = new Set<string>();
    
    if (category2.length === 0) {
      // Only categ1 selected - show all categ3 for any combination of selected categ1
      category1.forEach(c1 => {
        Object.keys(categories.categ1And2To3).forEach(key => {
          if (key.startsWith(`${c1}|`)) {
            const categ3s = categories.categ1And2To3[key] || [];
            categ3s.forEach(c3 => categ3Set.add(c3));
          }
        });
      });
    } else {
      // Both categ1 and categ2 selected - show categ3 for specific combinations
      category1.forEach(c1 => {
        category2.forEach(c2 => {
          const key = `${c1}|${c2}`;
          const categ3s = categories.categ1And2To3[key] || [];
          categ3s.forEach(c3 => categ3Set.add(c3));
        });
      });
    }
    
    return Array.from(categ3Set).sort();
  }, [category1, category2, categories.categ3, categories.categ1And2To3]);

  // Filter secondary offer statuses based on selected primary offer status
  const availableOfferStatusSecondary = useMemo(() => {
    if (offerStatus.length === 0) {
      return categories.offerStatusesSecondary;
    }
    
    const secondarySet = new Set<string>();
    offerStatus.forEach(primary => {
      const secondaries = categories.offerRelations[primary] || [];
      secondaries.forEach(sec => secondarySet.add(sec));
    });
    
    return Array.from(secondarySet).sort();
  }, [offerStatus, categories.offerStatusesSecondary, categories.offerRelations]);

  // Fetch available tip_produs_id_sub values based on current filters (excluding tipProdusFilter)
  const { data: availableTipProdusIds } = useQuery({
    queryKey: ["available-tip-produs", search, category1, category2, category3, offerStatus, offerStatusSecondary, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter, yliRoProdIdFilter, yliHuProdIdFilter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("tip_produs_id_sub");

      // Apply all filters except tipProdusFilter
      if (search) {
        query = query.or(`erp_product_code.ilike.%${search}%,erp_product_description.ilike.%${search}%`);
      }
      if (category1.length > 0) {
        query = query.in("categ1", category1);
      }
      if (category2.length > 0) {
        query = query.in("categ2", category2);
      }
      if (category3.length > 0) {
        query = query.in("categ3", category3);
      }
      if (offerStatus.length > 0) {
        query = query.in("stare_oferta", offerStatus);
      }
      if (offerStatusSecondary.length > 0) {
        query = query.in("stare_oferta_secundara", offerStatusSecondary);
      }
      if (stockStatus.length > 0) {
        query = query.in("stare_stoc", stockStatus);
      }
      if (validationFilter === "validated") {
        query = query.eq("validated", true);
      } else if (validationFilter === "not_validated") {
        query = query.or("validated.is.null,validated.eq.false");
      }
      if (yliRoSkuFilter === "blank") {
        query = query.is("yliro_sku", null);
      } else if (yliRoSkuFilter === "not_blank") {
        query = query.not("yliro_sku", "is", null);
      }
      if (yliHuSkuFilter === "blank") {
        query = query.is("ylihu_sku", null);
      } else if (yliHuSkuFilter === "not_blank") {
        query = query.not("ylihu_sku", "is", null);
      }
      if (yliRoProdIdFilter !== "all") {
        if (yliRoProdIdFilter === "null") {
          query = query.is("site_ro_product_id", null);
        } else if (yliRoProdIdFilter === "0") {
          query = query.eq("site_ro_product_id", 0);
        } else if (yliRoProdIdFilter === ">0") {
          query = query.gt("site_ro_product_id", 0);
        }
      }
      if (yliHuProdIdFilter !== "all") {
        if (yliHuProdIdFilter === "null") {
          query = query.is("site_hu_product_id", null);
        } else if (yliHuProdIdFilter === "0") {
          query = query.eq("site_hu_product_id", 0);
        } else if (yliHuProdIdFilter === ">0") {
          query = query.gt("site_hu_product_id", 0);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Extract unique tip_produs_id_sub values
      const idSet = new Set<number>();
      let hasNull = false;
      data?.forEach(p => {
        if (p.tip_produs_id_sub === null) {
          hasNull = true;
        } else {
          idSet.add(p.tip_produs_id_sub);
        }
      });

      return { ids: Array.from(idSet), hasNull };
    },
    staleTime: 30000,
  });

  // Filter productTypes based on available IDs from current filters
  const availableTipProdus = useMemo(() => {
    if (!availableTipProdusIds) {
      return productTypes; // Return all if query hasn't loaded yet
    }
    return productTypes.filter(type => 
      availableTipProdusIds.ids.includes(type.tipprodus_id)
    );
  }, [productTypes, availableTipProdusIds]);

  // Check if null option should be shown
  const showTipProdusNullOption = availableTipProdusIds?.hasNull ?? true;

  // Clear invalid selections when parent selections change
  useEffect(() => {
    // Clear invalid category2 when category1 changes
    if (category2.length > 0 && availableCateg2.length > 0) {
      const validCateg2 = category2.filter(c2 => availableCateg2.includes(c2));
      if (validCateg2.length !== category2.length) {
        setCategory2(validCateg2);
      }
    }
  }, [availableCateg2]);

  useEffect(() => {
    // Clear invalid category3 when category1 or category2 changes
    if (category3.length > 0 && availableCateg3.length > 0) {
      const validCateg3 = category3.filter(c3 => availableCateg3.includes(c3));
      if (validCateg3.length !== category3.length) {
        setCategory3(validCateg3);
      }
    }
  }, [availableCateg3]);

  useEffect(() => {
    // Clear invalid secondary offer statuses when primary offer status changes
    if (offerStatusSecondary.length > 0 && availableOfferStatusSecondary.length > 0) {
      const validSecondaries = offerStatusSecondary.filter(sec => 
        availableOfferStatusSecondary.includes(sec)
      );
      if (validSecondaries.length !== offerStatusSecondary.length) {
        setOfferStatusSecondary(validSecondaries);
      }
    }
  }, [availableOfferStatusSecondary]);

  // Reset tipProdusFilter when category filters change
  useEffect(() => {
    if (tipProdusFilter !== "all") {
      // Check if current tipProdusFilter is still valid for filtered products
      if (availableTipProdusIds) {
        const isValidSelection = 
          (tipProdusFilter === "null" && availableTipProdusIds.hasNull) ||
          (tipProdusFilter !== "null" && availableTipProdusIds.ids.includes(parseInt(tipProdusFilter)));
        
        if (!isValidSelection) {
          setTipProdusFilter("all");
        }
      }
    }
  }, [category1, category2, category3, availableTipProdusIds]);

  // Pagination calculations
  const filteredCount = totalCount || 0;
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCount);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, category1, category2, category3, offerStatus, offerStatusSecondary, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter, yliRoProdIdFilter, yliHuProdIdFilter, tipProdusFilter]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategory1([]);
    setCategory2([]);
    setCategory3([]);
    setOfferStatus([]);
    setOfferStatusSecondary([]);
    setStockStatus([]);
    setValidationFilter("all");
    setYliRoSkuFilter("all");
    setYliHuSkuFilter("all");
    setYliRoProdIdFilter("all");
    setYliHuProdIdFilter("all");
    setTipProdusFilter("all");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Manage and publish products to yli.ro and yli.hu
        </p>
      </div>

      <ProductFilters
        search={search}
        setSearch={setSearch}
        category1={category1}
        setCategory1={setCategory1}
        category2={category2}
        setCategory2={setCategory2}
        category3={category3}
        setCategory3={setCategory3}
        offerStatus={offerStatus}
        setOfferStatus={setOfferStatus}
        offerStatusSecondary={offerStatusSecondary}
        setOfferStatusSecondary={setOfferStatusSecondary}
        stockStatus={stockStatus}
        setStockStatus={setStockStatus}
        validationFilter={validationFilter}
        setValidationFilter={setValidationFilter}
        yliRoSkuFilter={yliRoSkuFilter}
        setYliRoSkuFilter={setYliRoSkuFilter}
        yliHuSkuFilter={yliHuSkuFilter}
        setYliHuSkuFilter={setYliHuSkuFilter}
        yliRoProdIdFilter={yliRoProdIdFilter}
        setYliRoProdIdFilter={setYliRoProdIdFilter}
        yliHuProdIdFilter={yliHuProdIdFilter}
        setYliHuProdIdFilter={setYliHuProdIdFilter}
        tipProdusFilter={tipProdusFilter}
        setTipProdusFilter={setTipProdusFilter}
        productTypes={availableTipProdus}
        showTipProdusNullOption={showTipProdusNullOption}
        categories={categories}
        availableCateg2={availableCateg2}
        availableCateg3={availableCateg3}
        availableOfferStatusSecondary={availableOfferStatusSecondary}
        onClearFilters={handleClearFilters}
        onRefresh={() => refetch()}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3">
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* <ProductImport onImportComplete={refetch} /> */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-11 md:h-9 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <ProductAddForm onSuccess={() => { setAddDialogOpen(false); refetch(); }} />
              </DialogContent>
            </Dialog>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {filteredCount} products
          </p>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-full sm:w-[130px] h-9">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ProductsTable 
        products={products || []} 
        onRefresh={refetch}
        onUpdateProduct={(updatedProduct) => {
          // Update only the specific product in the cache
          if (products) {
            const index = products.findIndex(p => p.erp_product_code === updatedProduct.erp_product_code);
            if (index !== -1) {
              const newProducts = [...products];
              newProducts[index] = { ...newProducts[index], ...updatedProduct };
              // Manually trigger a re-render with the updated product
              refetch();
            }
          }
        }}
        isAdmin={isAdmin} 
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
