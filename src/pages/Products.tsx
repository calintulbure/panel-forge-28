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
  const [stockStatus, setStockStatus] = useState<string[]>(
    searchParams.get("stock")?.split(",").filter(Boolean) || []
  );
  const [validationFilter, setValidationFilter] = useState(
    searchParams.get("validation") || "all"
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category1.length > 0) params.set("cat1", category1.join(","));
    if (category2.length > 0) params.set("cat2", category2.join(","));
    if (category3.length > 0) params.set("cat3", category3.join(","));
    if (offerStatus.length > 0) params.set("offer", offerStatus.join(","));
    if (stockStatus.length > 0) params.set("stock", stockStatus.join(","));
    if (validationFilter !== "all") params.set("validation", validationFilter);
    
    setSearchParams(params, { replace: true });
  }, [search, category1, category2, category3, offerStatus, stockStatus, validationFilter]);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      // Fetch all products by paginating through them
      let allProducts: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("erp_product_code", { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      return allProducts;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Extract unique categories and statuses with dynamic dependencies
  const categories = useMemo(() => {
    if (!products) return { categ1: [], categ2: [], categ3: [], offerStatuses: [], stockStatuses: [] };

    const categ1Set = new Set<string>();
    const categ2Map = new Map<string, Set<string>>(); // categ1 -> categ2 values
    const categ3Map = new Map<string, Set<string>>(); // categ2 -> categ3 values
    const offerSet = new Set<string>();
    const stockSet = new Set<string>();

    products.forEach((p) => {
      if (p.categ1) {
        categ1Set.add(p.categ1);
        if (p.categ2) {
          if (!categ2Map.has(p.categ1)) {
            categ2Map.set(p.categ1, new Set());
          }
          categ2Map.get(p.categ1)!.add(p.categ2);
          
          if (p.categ3) {
            if (!categ3Map.has(p.categ2)) {
              categ3Map.set(p.categ2, new Set());
            }
            categ3Map.get(p.categ2)!.add(p.categ3);
          }
        }
      }
      if (p.stare_oferta) offerSet.add(p.stare_oferta);
      if (p.stare_stoc) stockSet.add(p.stare_stoc);
    });

    return {
      categ1: Array.from(categ1Set).sort(),
      categ2: Array.from(new Set(Array.from(categ2Map.values()).flatMap(s => Array.from(s)))).sort(),
      categ3: Array.from(new Set(Array.from(categ3Map.values()).flatMap(s => Array.from(s)))).sort(),
      offerStatuses: Array.from(offerSet).sort(),
      stockStatuses: Array.from(stockSet).sort(),
      categ2Map,
      categ3Map,
    };
  }, [products]);

  // Dynamic category 2 options based on category 1 selection
  const availableCateg2 = useMemo(() => {
    if (!products || category1.length === 0) return categories.categ2;
    
    const categ2Set = new Set<string>();
    products.forEach(p => {
      if (p.categ1 && category1.includes(p.categ1) && p.categ2) {
        categ2Set.add(p.categ2);
      }
    });
    return Array.from(categ2Set).sort();
  }, [products, category1, categories.categ2]);

  // Dynamic category 3 options based on category 2 selection
  const availableCateg3 = useMemo(() => {
    if (!products || category2.length === 0) return categories.categ3;
    
    const categ3Set = new Set<string>();
    products.forEach(p => {
      if (p.categ2 && category2.includes(p.categ2) && p.categ3) {
        categ3Set.add(p.categ3);
      }
    });
    return Array.from(categ3Set).sort();
  }, [products, category2, categories.categ3]);

  // Clear dependent categories when parent changes
  useEffect(() => {
    if (category1.length === 0) {
      setCategory2([]);
      setCategory3([]);
    } else {
      // Remove invalid category2 selections
      const validCateg2 = category2.filter(c2 => availableCateg2.includes(c2));
      if (validCateg2.length !== category2.length) {
        setCategory2(validCateg2);
      }
    }
  }, [category1, availableCateg2]);

  useEffect(() => {
    if (category2.length === 0) {
      setCategory3([]);
    } else {
      // Remove invalid category3 selections
      const validCateg3 = category3.filter(c3 => availableCateg3.includes(c3));
      if (validCateg3.length !== category3.length) {
        setCategory3(validCateg3);
      }
    }
  }, [category2, availableCateg3]);

  // Filter products with OR logic for multi-selects
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        product.erp_product_code?.toLowerCase().includes(searchLower) ||
        product.erp_product_description?.toLowerCase().includes(searchLower);

      // Category filters (OR logic - match any selected)
      const matchesCategory1 = category1.length === 0 || category1.includes(product.categ1 || "");
      const matchesCategory2 = category2.length === 0 || category2.includes(product.categ2 || "");
      const matchesCategory3 = category3.length === 0 || category3.includes(product.categ3 || "");

      // Status filters (OR logic - match any selected)
      const matchesOfferStatus = offerStatus.length === 0 || offerStatus.includes(product.stare_oferta || "");
      const matchesStockStatus = stockStatus.length === 0 || stockStatus.includes(product.stare_stoc || "");

      // Validation filter
      const matchesValidation = 
        validationFilter === "all" ||
        (validationFilter === "validated" && product.validated === true) ||
        (validationFilter === "not_validated" && product.validated !== true);

      return (
        matchesSearch &&
        matchesCategory1 &&
        matchesCategory2 &&
        matchesCategory3 &&
        matchesOfferStatus &&
        matchesStockStatus &&
        matchesValidation
      );
    });
  }, [products, search, category1, category2, category3, offerStatus, stockStatus, validationFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, category1, category2, category3, offerStatus, stockStatus, validationFilter]);

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
    setStockStatus([]);
    setValidationFilter("all");
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
        stockStatus={stockStatus}
        setStockStatus={setStockStatus}
        validationFilter={validationFilter}
        setValidationFilter={setValidationFilter}
        categories={categories}
        availableCateg2={availableCateg2}
        availableCateg3={availableCateg3}
        onClearFilters={handleClearFilters}
        onRefresh={() => refetch()}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
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
      </div>

      <ProductsTable products={paginatedProducts} onRefresh={refetch} isAdmin={isAdmin} />

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
