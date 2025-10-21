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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Article ID</TableHead>
              <TableHead>Product Info</TableHead>
              <TableHead>Category 1</TableHead>
              <TableHead>Category 2</TableHead>
              <TableHead>Category 3</TableHead>
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
                <TableCell colSpan={isAdmin ? 11 : 10} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.erp_product_code}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium" onClick={() => setSelectedProduct(product)}>
                    {product.articol_id || "-"}
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-sm">{product.erp_product_code}</div>
                      <div className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {product.erp_product_description || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>{product.categ1 || "-"}</TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>{product.categ2 || "-"}</TableCell>
                  <TableCell onClick={() => setSelectedProduct(product)}>{product.categ3 || "-"}</TableCell>
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
                    <PublishCell
                      productCode={product.erp_product_code}
                      snapshotBase64={product.site_ro_snapshot_base64}
                      siteUrl={product.site_ro_url}
                      sku={product.yliro_sku}
                      site="ro"
                      onUpdate={onRefresh}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PublishCell
                      productCode={product.erp_product_code}
                      snapshotBase64={product.site_hu_snapshot_base64}
                      siteUrl={product.site_hu_url}
                      sku={product.ylihu_sku}
                      site="hu"
                      onUpdate={onRefresh}
                    />
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
