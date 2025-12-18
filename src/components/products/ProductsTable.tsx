import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, CheckCircle2, XCircle, Copy } from "lucide-react";
import { ProductDetailPanel } from "./ProductDetailPanel";
import { PublishCell } from "./PublishCell";
import { ProductTypeSelector } from "./ProductTypeSelector";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProductTypes } from "@/hooks/useProductTypes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Product {
  erp_product_code: string;
  articol_id: number | null;
  erp_product_description: string | null;
  categ1: string | null;
  categ2: string | null;
  categ3: string | null;
  stare_oferta: string | null;
  stare_oferta_secundara: string | null;
  stare_stoc: string | null;
  site_ro_url: string | null;
  site_ro_snapshot_url: string | null;
  site_ro_snapshot_base64: string | null;
  yliro_sku: string | null;
  yliro_descriere: string | null;
  site_hu_url: string | null;
  site_hu_snapshot_url: string | null;
  site_hu_snapshot_base64: string | null;
  ylihu_sku: string | null;
  ylihu_descriere: string | null;
  validated: boolean | null;
  senior_erp_link: string | null;
  ro_stock: number | null;
  ro_stoc_detailed: string | null;
  tip_produs_id_sub: number | null;
  tip_produs_id_main: number | null;
}
interface ProductsTableProps {
  products: Product[];
  onRefresh: () => void;
  onUpdateProduct?: (updatedProduct: Product) => void;
  isAdmin: boolean;
}
export function ProductsTable({
  products,
  onRefresh,
  onUpdateProduct,
  isAdmin
}: ProductsTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const {
    toast
  } = useToast();
  const {
    updateProductType
  } = useProductTypes();
  const handleProductTypeChange = async (productCode: string, typeId: number | null, typeName: string | null) => {
    const result = await updateProductType(productCode, typeId);
    if (result) {
      toast({
        title: "Product type updated",
        description: typeName ? `Set to: ${typeName}` : "Type cleared"
      });
      onRefresh();
    }
  };
  const sortedProducts = [...products].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  const handleSort = (key: keyof Product) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  const handleValidationToggle = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const {
        error
      } = await supabase.from("products").update({
        validated: !product.validated
      }).eq("erp_product_code", product.erp_product_code);
      if (error) throw error;
      toast({
        title: "Validation updated",
        description: `Product ${product.validated ? "invalidated" : "validated"}`
      });
      onRefresh();
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error updating validation",
        description: error instanceof Error ? error.message : "Failed to update validation",
        variant: "destructive"
      });
    }
  };
  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const {
        error
      } = await supabase.from("products").delete().eq("erp_product_code", productToDelete.erp_product_code);
      if (error) throw error;
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted"
      });
      onRefresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting product",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };
  const getStockBadgeVariant = (status: string | null) => {
    if (!status) return "secondary";
    const lower = status.toLowerCase();
    if (lower.includes("stoc") || lower.includes("stock")) return "default";
    if (lower.includes("epuizat") || lower.includes("out")) return "destructive";
    return "secondary";
  };
  const getOfferBadgeVariant = (status: string | null) => {
    if (!status) return "secondary";
    const lower = status.toLowerCase();
    if (lower.includes("activ") || lower.includes("active")) return "default";
    return "secondary";
  };
  return <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-background border-b">
            <TableRow>
              <TableHead className="w-[160px]">
                <Button variant="ghost" onClick={() => handleSort('erp_product_code')} className="h-8 px-2">
                  Product Info
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[200px]">
                <Button variant="ghost" onClick={() => handleSort('categ1')} className="h-8 px-2">
                  Categories
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">Product Type</TableHead>
              <TableHead className="w-[120px]">
                <Button variant="ghost" onClick={() => handleSort('stare_stoc')} className="h-8 px-2">
                  Stock Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">
                <Button variant="ghost" onClick={() => handleSort('stare_oferta')} className="h-8 px-2">
                  Offer Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center w-[90px]">RO Publish</TableHead>
              <TableHead className="text-center w-[90px]">HU Publish</TableHead>
              <TableHead className="text-center w-[60px]">
                <Button variant="ghost" onClick={() => handleSort('validated')} className="h-8 px-2">
                  Validated
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              {isAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow> : sortedProducts.map(product => <TableRow key={product.erp_product_code} className="cursor-pointer hover:bg-muted/50 group">
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        {product.senior_erp_link ? <a href={product.senior_erp_link} onClick={e => e.stopPropagation()} className="font-bold hover:underline truncate text-xl">
                            {product.erp_product_code}
                          </a> : <div className="font-bold text-base truncate">{product.erp_product_code}</div>}
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(product.erp_product_code);
                    toast({
                      description: "Code copied to clipboard"
                    });
                  }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {product.erp_product_description || "-"}
                      </div>
                      {product.ro_stock !== null && <div className="text-xs text-muted-foreground">
                          Stoc: {product.ro_stock}
                        </div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs" onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-0.5">
                      <div className="truncate">{product.categ1 || "-"}</div>
                      <div className="truncate text-muted-foreground">{product.categ2 || "-"}</div>
                      <div className="truncate text-muted-foreground">{product.categ3 || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <ProductTypeSelector value={product.tip_produs_id_sub || null} onChange={(typeId, typeName) => handleProductTypeChange(product.erp_product_code, typeId, typeName)} />
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <Badge variant={getStockBadgeVariant(product.stare_stoc)}>
                      {product.stare_stoc || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getOfferBadgeVariant(product.stare_oferta)}>
                        {product.stare_oferta || "Unknown"}
                      </Badge>
                      {product.stare_oferta_secundara && <Badge variant="outline" className="text-xs">
                          {product.stare_oferta_secundara}
                        </Badge>}
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <PublishCell productCode={product.erp_product_code} productDescription={product.erp_product_description} snapshotBase64={product.site_ro_snapshot_base64} siteUrl={product.site_ro_url} sku={product.yliro_sku} skuClassName="font-bold text-black dark:text-white" site="ro" onUpdate={onRefresh} />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <PublishCell productCode={product.erp_product_code} productDescription={product.erp_product_description} snapshotBase64={product.site_hu_snapshot_base64} siteUrl={product.site_hu_url} sku={product.ylihu_sku} skuClassName="font-bold text-black dark:text-white" site="hu" onUpdate={onRefresh} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={e => handleValidationToggle(product, e)} className="h-24 w-24 [&_svg]:size-8">
                      {product.validated ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  {isAdmin}
                </TableRow>)}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedProducts.length === 0 ? <div className="text-center py-12 text-muted-foreground">
            No products found.
          </div> : sortedProducts.map(product => <div key={product.erp_product_code} className="border rounded-lg p-4 space-y-3 bg-card" onClick={() => setSelectedProduct(product)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {product.senior_erp_link ? <a href={product.senior_erp_link} className="font-bold text-base hover:underline truncate" onClick={e => e.stopPropagation()}>
                        {product.erp_product_code}
                      </a> : <div className="font-bold text-base truncate">{product.erp_product_code}</div>}
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={e => {
                e.stopPropagation();
                navigator.clipboard.writeText(product.erp_product_code);
                toast({
                  description: "Code copied to clipboard"
                });
              }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {product.erp_product_description || "-"}
                  </div>
                  {product.ro_stock !== null && <div className="text-xs text-muted-foreground">
                      Stoc: {product.ro_stock}
                    </div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={e => handleValidationToggle(product, e)} className="h-16 w-16">
                    {product.validated ? <CheckCircle2 className="h-7 w-7 text-green-600" /> : <XCircle className="h-7 w-7 text-muted-foreground" />}
                  </Button>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={e => {
              e.stopPropagation();
              setProductToDelete(product);
              setDeleteDialogOpen(true);
            }} className="h-11 w-11">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Cat 1</div>
                  <div className="font-medium truncate">{product.categ1 || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cat 2</div>
                  <div className="font-medium truncate">{product.categ2 || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cat 3</div>
                  <div className="font-medium truncate">{product.categ3 || "-"}</div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant={getStockBadgeVariant(product.stare_stoc)} className="text-xs">
                  {product.stare_stoc || "Unknown"}
                </Badge>
                <Badge variant={getOfferBadgeVariant(product.stare_oferta)} className="text-xs">
                  {product.stare_oferta || "Unknown"}
                </Badge>
                {product.stare_oferta_secundara && <Badge variant="outline" className="text-xs">
                    {product.stare_oferta_secundara}
                  </Badge>}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t" onClick={e => e.stopPropagation()}>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">RO</div>
                  <PublishCell productCode={product.erp_product_code} productDescription={product.erp_product_description} snapshotBase64={product.site_ro_snapshot_base64} siteUrl={product.site_ro_url} sku={product.yliro_sku} site="ro" onUpdate={onRefresh} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">HU</div>
                  <PublishCell productCode={product.erp_product_code} productDescription={product.erp_product_description} snapshotBase64={product.site_hu_snapshot_base64} siteUrl={product.site_hu_url} sku={product.ylihu_sku} site="hu" onUpdate={onRefresh} />
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full h-11" onClick={() => setSelectedProduct(product)}>
                View Details
              </Button>
            </div>)}
      </div>

      {selectedProduct && <ProductDetailPanel product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} onUpdate={updatedProduct => {
      if (updatedProduct && onUpdateProduct) {
        onUpdateProduct(updatedProduct);
      } else {
        onRefresh();
      }
    }} isAdmin={isAdmin} />}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{productToDelete?.erp_product_code}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}