import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ProductImportProps {
  onImportComplete: () => void;
}

export function ProductImport({ onImportComplete }: ProductImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const products = jsonData.map((row: any) => ({
        erp_product_code: row.erp_product_code || row.ERP_Code,
        articol_id: row.articol_id || row.Article_ID,
        erp_product_description: row.erp_product_description || row.Description,
        categ1: row.categ1 || row.Category1,
        categ2: row.categ2 || row.Category2,
        categ3: row.categ3 || row.Category3,
        stare_oferta: row.stare_oferta || row.Offer_Status,
        stare_stoc: row.stare_stoc || row.Stock_Status,
      }));

      // Use upsert with primary key to handle duplicates
      const { error } = await supabase
        .from("products")
        .upsert(products, { 
          onConflict: "erp_product_code",
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Imported ${products.length} products`,
      });

      onImportComplete();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import products",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        id="xlsx-upload"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => document.getElementById("xlsx-upload")?.click()}
        disabled={isImporting}
      >
        <Upload className="h-4 w-4 mr-2" />
        {isImporting ? "Importing..." : "Import XLSX"}
      </Button>
    </>
  );
}
