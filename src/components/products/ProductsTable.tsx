import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { ProductDetailPanel } from "./ProductDetailPanel";
import { PublishCell } from "./PublishCell";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  erp_product_code: string;
  articol_id: number | null;
  erp_product_description: string | null;
  categ1: string | null;
  categ2: string | null;
  categ3: string | null;
  stare_oferta: string | null;
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
}

interface ProductsTableProps {
  products: Product[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export function ProductsTable({ products, onRefresh, isAdmin }: ProductsTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  const handleValidationToggle = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("products")
        .update({ validated: !product.validated })
        .eq("erp_product_code", product.erp_product_code);

      if (error) throw error;

      toast({
        title: "Validation updated",
        description: `Product ${product.validated ? "invalidated" : "validated"}`,
      });

      onRefresh();
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error updating validation",
        description: error instanceof Error ? error.message : "Failed to update validation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("erp_product_code", productToDelete.erp_product_code);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted",
      });

      onRefresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting product",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
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

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Article ID</TableHead>
              <TableHead className="w-[180px]">Product Info</TableHead>
              <TableHead className="w-[180px]">Categories</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Offer Status</TableHead>
              <TableHead className="text-center">RO Publish</TableHead>
              <TableHead className="text-center">HU Publish</TableHead>
              <TableHead className="text-center">Validated</TableHead>
              {isAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.erp_product_code}
                  className="cursor-pointer hover:bg-muted/50 group"
                >
                  <TableCell className="font-medium" onClick={() => setSelectedProduct(product)}>
                    {product.articol_id || "-"}
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-sm">{product.erp_product_code}</div>
                      <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {product.erp_product_description || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs" onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-0.5">
                      <div className="truncate max-w-[180px]">{product.categ1 || "-"}</div>
                      <div className="truncate max-w-[180px] text-muted-foreground">{product.categ2 || "-"}</div>
                      <div className="truncate max-w-[180px] text-muted-foreground">{product.categ3 || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <Badge variant={getStockBadgeVariant(product.stare_stoc)}>
                      {product.stare_stoc || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <Badge variant={getOfferBadgeVariant(product.stare_oferta)}>
                      {product.stare_oferta || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="relative group/snapshot">
                      <PublishCell
                        productCode={product.erp_product_code}
                        snapshotBase64={product.site_ro_snapshot_base64}
                        siteUrl={product.site_ro_url}
                        sku={product.yliro_sku}
                        site="ro"
                        onUpdate={onRefresh}
                      />
                      {product.site_ro_snapshot_base64 && (
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/snapshot:opacity-100 pointer-events-none z-[100] transition-opacity duration-200">
                          <img
                            src={`data:image/jpeg;base64,${product.site_ro_snapshot_base64}`}
                            alt="RO Snapshot"
                            className="w-[400px] rounded-lg shadow-2xl border-4 border-border bg-background"
                            style={{ transform: 'scale(2)' }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="relative group/snapshot">
                      <PublishCell
                        productCode={product.erp_product_code}
                        snapshotBase64={product.site_hu_snapshot_base64}
                        siteUrl={product.site_hu_url}
                        sku={product.ylihu_sku}
                        site="hu"
                        onUpdate={onRefresh}
                      />
                      {product.site_hu_snapshot_base64 && (
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/snapshot:opacity-100 pointer-events-none z-[100] transition-opacity duration-200">
                          <img
                            src={`data:image/jpeg;base64,${product.site_hu_snapshot_base64}`}
                            alt="HU Snapshot"
                            className="w-[400px] rounded-lg shadow-2xl border-4 border-border bg-background"
                            style={{ transform: 'scale(2)' }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleValidationToggle(product, e)}
                      className="h-8 w-8"
                    >
                      {product.validated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToDelete(product);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No products found.
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.erp_product_code}
              className="border rounded-lg p-4 space-y-3 bg-card"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{product.erp_product_code}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {product.erp_product_description || "-"}
                  </div>
                  {product.articol_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {product.articol_id}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleValidationToggle(product, e)}
                    className="h-11 w-11"
                  >
                    {product.validated ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(product);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-11 w-11"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
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
              </div>

              <div className="flex items-center gap-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">RO</div>
                  <PublishCell
                    productCode={product.erp_product_code}
                    snapshotBase64={product.site_ro_snapshot_base64}
                    siteUrl={product.site_ro_url}
                    sku={product.yliro_sku}
                    site="ro"
                    onUpdate={onRefresh}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">HU</div>
                  <PublishCell
                    productCode={product.erp_product_code}
                    snapshotBase64={product.site_hu_snapshot_base64}
                    siteUrl={product.site_hu_url}
                    sku={product.ylihu_sku}
                    site="hu"
                    onUpdate={onRefresh}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-11"
                onClick={() => setSelectedProduct(product)}
              >
                View Details
              </Button>
            </div>
          ))
        )}
      </div>

      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={onRefresh}
          isAdmin={isAdmin}
        />
      )}

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
    </>
  );
}
