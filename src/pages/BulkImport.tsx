import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Code, Database, FileSpreadsheet } from "lucide-react";
import { ProductImport } from "@/components/products/ProductImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BulkImport() {
  const [jsonData, setJsonData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleJsonImport = async () => {
    if (!jsonData.trim()) {
      toast({
        title: "Error",
        description: "Please enter JSON data",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const payload = JSON.parse(jsonData);
      const dataArray = Array.isArray(payload) ? payload : [payload];

      const { data, error } = await supabase.functions.invoke("bulk-upsert-products", {
        body: { payload: dataArray },
      });

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Processed ${data?.affected || dataArray.length} products`,
      });

      setJsonData("");
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import products",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleJson = `[
  {
    "erp_product_code": "ABC123",
    "articol_id": 1001,
    "erp_product_description": "Product Description",
    "categ1": "Category 1",
    "categ2": "Category 2",
    "categ3": "Category 3",
    "stare_oferta": "Active",
    "stare_stoc": "In Stock",
    "site_ro_product_id": 100,
    "site_hu_product_id": 200,
    "ro_stock": 50,
    "hu_stock": 30
  }
]`;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bulk Data Import</h1>
        <p className="text-muted-foreground mt-2">
          Import product data using various methods
        </p>
      </div>

      <Tabs defaultValue="xlsx" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="xlsx">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            XLSX File
          </TabsTrigger>
          <TabsTrigger value="json">
            <Code className="h-4 w-4 mr-2" />
            JSON Data
          </TabsTrigger>
          <TabsTrigger value="api">
            <Database className="h-4 w-4 mr-2" />
            API Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="xlsx" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload XLSX File
              </CardTitle>
              <CardDescription>
                Import products from an Excel spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Required Columns:</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">erp_product_code</code> - Unique product code (required)</li>
                  <li><code className="bg-muted px-1 rounded">articol_id</code> - Article ID (required)</li>
                  <li><code className="bg-muted px-1 rounded">erp_product_description</code> - Product description</li>
                  <li><code className="bg-muted px-1 rounded">categ1</code>, <code className="bg-muted px-1 rounded">categ2</code>, <code className="bg-muted px-1 rounded">categ3</code> - Category levels</li>
                  <li><code className="bg-muted px-1 rounded">stare_oferta</code> - Offer status</li>
                  <li><code className="bg-muted px-1 rounded">stare_stoc</code> - Stock status</li>
                  <li><code className="bg-muted px-1 rounded">site_ro_product_id</code>, <code className="bg-muted px-1 rounded">site_hu_product_id</code> - Site product IDs</li>
                  <li><code className="bg-muted px-1 rounded">ro_stock</code>, <code className="bg-muted px-1 rounded">hu_stock</code> - Stock quantities</li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <ProductImport onImportComplete={() => {
                  toast({
                    title: "Import completed",
                    description: "Products have been imported successfully",
                  });
                }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                JSON Data Import
              </CardTitle>
              <CardDescription>
                Paste JSON data directly for bulk import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">JSON Payload</label>
                <Textarea
                  placeholder={exampleJson}
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="font-mono text-xs min-h-[300px]"
                />
              </div>

              <Button
                onClick={handleJsonImport}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Import JSON Data"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                API Endpoints
              </CardTitle>
              <CardDescription>
                Use these endpoints for programmatic bulk imports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold">1. Bulk Upsert Products</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Endpoint:</strong></p>
                  <code className="block bg-background p-2 rounded text-xs">
                    POST /functions/v1/bulk-upsert-products
                  </code>
                  <p className="text-sm pt-2"><strong>Body:</strong></p>
                  <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "payload": [
    {
      "erp_product_code": "ABC123",
      "articol_id": 1001,
      "erp_product_description": "Product Name",
      "categ1": "Category",
      // ... other fields
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">2. Manage Products (Chunked)</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Endpoint:</strong></p>
                  <code className="block bg-background p-2 rounded text-xs">
                    POST /functions/v1/manage-products
                  </code>
                  <p className="text-sm pt-2"><strong>Body:</strong></p>
                  <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "operation": "upsert",
  "data": [
    // array of products
  ]
}`}
                  </pre>
                  <p className="text-xs text-muted-foreground pt-2">
                    * Automatically processes data in chunks of 500 records
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">3. Supabase Client (JavaScript)</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke(
  "bulk-upsert-products",
  {
    body: { payload: productsArray }
  }
);`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

