import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductFilters } from "@/components/products/ProductFilters";
import { Loader2 } from "lucide-react";

export default function Products() {
  const [search, setSearch] = useState("");
  const [category1, setCategory1] = useState("all");
  const [category2, setCategory2] = useState("all");
  const [category3, setCategory3] = useState("all");
  const [offerStatus, setOfferStatus] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [onlyValidated, setOnlyValidated] = useState(false);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("article_id", { ascending: true });

      if (error) throw error;
      return data;
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
      const matchesValidation = !onlyValidated || product.validated === true;

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
  }, [products, search, category1, category2, category3, offerStatus, stockStatus, onlyValidated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground mt-1">
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
        onlyValidated={onlyValidated}
        setOnlyValidated={setOnlyValidated}
        categories={categories}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products?.length || 0} products
        </p>
      </div>

      <ProductsTable products={filteredProducts} onRefresh={refetch} />
    </div>
  );
}
