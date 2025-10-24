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
  const [yliRoSkuFilter, setYliRoSkuFilter] = useState(
    searchParams.get("roSku") || "all"
  );
  const [yliHuSkuFilter, setYliHuSkuFilter] = useState(
    searchParams.get("huSku") || "all"
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
    if (yliRoSkuFilter !== "all") params.set("roSku", yliRoSkuFilter);
    if (yliHuSkuFilter !== "all") params.set("huSku", yliHuSkuFilter);
    
    setSearchParams(params, { replace: true });
  }, [search, category1, category2, category3, offerStatus, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter]);

  // Fetch filter options (categories and statuses)
  const { data: filterOptions } = useQuery({
    queryKey: ["products-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("categ1,categ2,categ3,stare_oferta,stare_stoc");

      if (error) throw error;

      const categ1Set = new Set<string>();
      const categ2Set = new Set<string>();
      const categ3Set = new Set<string>();
      const offerSet = new Set<string>();
      const stockSet = new Set<string>();

      data?.forEach((p) => {
        if (p.categ1) categ1Set.add(p.categ1);
        if (p.categ2) categ2Set.add(p.categ2);
        if (p.categ3) categ3Set.add(p.categ3);
        if (p.stare_oferta) offerSet.add(p.stare_oferta);
        if (p.stare_stoc) stockSet.add(p.stare_stoc);
      });

      return {
        categ1: Array.from(categ1Set).sort(),
        categ2: Array.from(categ2Set).sort(),
        categ3: Array.from(categ3Set).sort(),
        offerStatuses: Array.from(offerSet).sort(),
        stockStatuses: Array.from(stockSet).sort(),
      };
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch total count with filters
  const { data: totalCount } = useQuery({
    queryKey: ["products-count", search, category1, category2, category3, offerStatus, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter],
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

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch paginated products with filters
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products", currentPage, itemsPerPage, search, category1, category2, category3, offerStatus, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter],
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

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const categories = useMemo(() => {
    return filterOptions || { categ1: [], categ2: [], categ3: [], offerStatuses: [], stockStatuses: [] };
  }, [filterOptions]);

  // Use all categories for filters (no dynamic filtering for simplicity)
  const availableCateg2 = categories.categ2;
  const availableCateg3 = categories.categ3;

  // Pagination calculations
  const filteredCount = totalCount || 0;
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCount);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [search, category1, category2, category3, offerStatus, stockStatus, validationFilter, yliRoSkuFilter, yliHuSkuFilter]);

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
    setYliRoSkuFilter("all");
    setYliHuSkuFilter("all");
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
        yliRoSkuFilter={yliRoSkuFilter}
        setYliRoSkuFilter={setYliRoSkuFilter}
        yliHuSkuFilter={yliHuSkuFilter}
        setYliHuSkuFilter={setYliHuSkuFilter}
        categories={categories}
        availableCateg2={availableCateg2}
        availableCateg3={availableCateg3}
        onClearFilters={handleClearFilters}
        onRefresh={() => refetch()}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

      <ProductsTable products={products || []} onRefresh={refetch} isAdmin={isAdmin} />

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
