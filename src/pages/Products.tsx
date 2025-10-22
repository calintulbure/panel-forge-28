import { useState, useMemo } from "react";
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

export default function Products() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const [search, setSearch] = useState("");
  const [category1, setCategory1] = useState("all");
  const [category2, setCategory2] = useState("all");
  const [category3, setCategory3] = useState("all");
  const [offerStatus, setOfferStatus] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

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
  });

  // Extract unique categories and statuses
  const categories = useMemo(() => {
    if (!products) return { categ1: [], categ2: [], categ3: [], offerStatuses: [], stockStatuses: [] };

    const categ1Set = new Set<string>();
    const categ2Set = new Set<string>();
    const categ3Set = new Set<string>();
    const offerSet = new Set<string>();
    const stockSet = new Set<string>();

    products.forEach((p) => {
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
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        product.erp_product_code?.toLowerCase().includes(searchLower) ||
        product.erp_product_description?.toLowerCase().includes(searchLower);

      // Category filters
      const matchesCategory1 = category1 === "all" || product.categ1 === category1;
      const matchesCategory2 = category2 === "all" || product.categ2 === category2;
      const matchesCategory3 = category3 === "all" || product.categ3 === category3;

      // Status filters
      const matchesOfferStatus = offerStatus === "all" || product.stare_oferta === offerStatus;
      const matchesStockStatus = stockStatus === "all" || product.stare_stoc === stockStatus;

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
    setCategory1("all");
    setCategory2("all");
    setCategory3("all");
    setOfferStatus("all");
    setStockStatus("all");
    setValidationFilter("all");
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
        onClearFilters={handleClearFilters}
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
