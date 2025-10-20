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
import { Check, X } from "lucide-react";
import { ProductDetailPanel } from "./ProductDetailPanel";

interface Product {
  article_id: number;
  erp_product_code: string | null;
  erp_product_description: string | null;
  categ1: string | null;
  categ2: string | null;
  categ3: string | null;
  stare_oferta: string | null;
  stare_stoc: string | null;
  site_ro_url: string | null;
  site_ro_snapshot_url: string | null;
  yliro_sku: string | null;
  yliro_descriere: string | null;
  site_hu_url: string | null;
  site_hu_snapshot_url: string | null;
  ylihu_sku: string | null;
  ylihu_descriere: string | null;
  validated: boolean | null;
}

interface ProductsTableProps {
  products: Product[];
  onRefresh: () => void;
}

export function ProductsTable({ products, onRefresh }: ProductsTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
              <TableHead>ERP Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category 1</TableHead>
              <TableHead>Category 2</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Offer Status</TableHead>
              <TableHead>RO SKU</TableHead>
              <TableHead>HU SKU</TableHead>
              <TableHead className="text-center">Validated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.article_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedProduct(product)}
                >
                  <TableCell className="font-medium">{product.article_id}</TableCell>
                  <TableCell>{product.erp_product_code || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {product.erp_product_description || "-"}
                  </TableCell>
                  <TableCell>{product.categ1 || "-"}</TableCell>
                  <TableCell>{product.categ2 || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getStockBadgeVariant(product.stare_stoc)}>
                      {product.stare_stoc || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOfferBadgeVariant(product.stare_oferta)}>
                      {product.stare_oferta || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.yliro_sku || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.ylihu_sku || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.validated ? (
                      <Check className="h-4 w-4 text-success mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
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
        />
      )}
    </>
  );
}
