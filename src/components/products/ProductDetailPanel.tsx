import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Save, Check, Lock, ExternalLink, CheckCircle2, Trash2, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface ProductDetailPanelProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onUpdate: (updatedProduct?: Product) => void;
  isAdmin: boolean;
}

export function ProductDetailPanel({ product, open, onClose, onUpdate, isAdmin }: ProductDetailPanelProps) {
  const [roUrl, setRoUrl] = useState(product.site_ro_url || "");
  const [huUrl, setHuUrl] = useState(product.site_hu_url || "");
  const [validated, setValidated] = useState(product.validated || false);
  const [loading, setLoading] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearSite, setClearSite] = useState<"ro" | "hu" | null>(null);
  const [currentProduct, setCurrentProduct] = useState(product);

  // Fetch fresh data from database when panel opens
  useEffect(() => {
    if (open) {
      const fetchFreshData = async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("erp_product_code", product.erp_product_code)
          .single();
        
        if (data && !error) {
          setCurrentProduct(data);
          setRoUrl(data.site_ro_url || "");
          setHuUrl(data.site_hu_url || "");
          setValidated(data.validated || false);
        }
      };
      fetchFreshData();
    }
  }, [open, product.erp_product_code]);

  // Sync state when product changes
  useEffect(() => {
    setCurrentProduct(product);
    setRoUrl(product.site_ro_url || "");
    setHuUrl(product.site_hu_url || "");
    setValidated(product.validated || false);
  }, [product]);

  const handleRefreshSnapshot = async (site: "ro" | "hu") => {
    const url = site === "ro" ? roUrl : huUrl;
    
    if (!url) {
      toast.error("Please enter a URL first");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('trigger-snapshot', {
        body: {
          productCode: product.erp_product_code,
          siteUrl: url,
          site: site
        }
      });

      if (error) throw error;
      
      toast.success(`${site.toUpperCase()} snapshot refreshed successfully`);
      
      // Fetch fresh data immediately after refresh
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("erp_product_code", product.erp_product_code)
        .single();
      
      if (data && !fetchError) {
        setCurrentProduct(data);
        setRoUrl(data.site_ro_url || "");
        setHuUrl(data.site_hu_url || "");
        setValidated(data.validated || false);
        // Trigger a selective update with the fresh data
        onUpdate(data);
      } else {
        onUpdate();
      }
    } catch (error) {
      toast.error(`Failed to refresh ${site.toUpperCase()} snapshot`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async (field: "site_ro_url" | "site_hu_url", value: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ [field]: value })
        .eq("erp_product_code", product.erp_product_code);

      if (error) throw error;
      toast.success("URL saved successfully");
      
      // Automatically trigger snapshot refresh after URL is saved
      const site = field === "site_ro_url" ? "ro" : "hu";
      await handleRefreshSnapshot(site);
      
      onUpdate();
    } catch (error) {
      toast.error("Failed to save URL");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ validated: !validated })
        .eq("erp_product_code", product.erp_product_code);

      if (error) throw error;
      setValidated(!validated);
      toast.success(validated ? "Product unvalidated" : "Product validated successfully");
      onUpdate();
    } catch (error) {
      toast.error("Failed to update validation status");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearUrls = async () => {
    if (!clearSite) return;
    
    setLoading(true);
    try {
      const updateData = clearSite === "ro" ? {
        site_ro_url: null,
        site_ro_snapshot_url: null,
        site_ro_snapshot_base64: null,
        yliro_sku: null,
        yliro_descriere: null,
        validated: false
      } : {
        site_hu_url: null,
        site_hu_snapshot_url: null,
        site_hu_snapshot_base64: null,
        ylihu_sku: null,
        ylihu_descriere: null,
        validated: false
      };

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("erp_product_code", product.erp_product_code);

      if (error) throw error;
      
      if (clearSite === "ro") {
        setRoUrl("");
      } else {
        setHuUrl("");
      }
      setValidated(false);
      
      toast.success(`${clearSite.toUpperCase()} product data cleared successfully`);
      
      // Fetch fresh data to propagate the cleared state
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("erp_product_code", product.erp_product_code)
        .single();
      
      if (data && !fetchError) {
        setCurrentProduct(data);
        onUpdate(data);
      } else {
        onUpdate();
      }
    } catch (error) {
      toast.error(`Failed to clear ${clearSite?.toUpperCase()} data`);
      console.error(error);
    } finally {
      setLoading(false);
      setClearDialogOpen(false);
      setClearSite(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle>Product Details - #{currentProduct.articol_id}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ERP INFO */}
          <div>
            <h3 className="text-lg font-semibold mb-4">ERP Information</h3>
            <div className="relative rounded-lg border bg-card p-6">
              {/* Left side - main content */}
              <div className="pr-32">
                <div className="space-y-3">
                  {/* ERP Code - 50% larger with link styling */}
                  <div className="flex items-center gap-2">
                    {currentProduct.senior_erp_link ? (
                      <a 
                        href={currentProduct.senior_erp_link} 
                        className="font-bold text-3xl hover:underline hover:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {currentProduct.erp_product_code || "-"}
                      </a>
                    ) : (
                      <p className="font-bold text-3xl text-foreground">{currentProduct.erp_product_code || "-"}</p>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(currentProduct.erp_product_code);
                        toast.success("Code copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Description */}
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {currentProduct.erp_product_description || "-"}
                  </p>
                  
                  <Separator className="my-4" />
                  
                  {/* Categories with indentation */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{currentProduct.categ1 || "-"}</p>
                    <p className="text-sm text-muted-foreground ml-6">{currentProduct.categ2 || "-"}</p>
                    <p className="text-sm text-muted-foreground ml-12">{currentProduct.categ3 || "-"}</p>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {/* Stock Information */}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Stock: <span className="font-bold text-lg">{currentProduct.ro_stock !== null ? currentProduct.ro_stock : "-"}</span>
                    </p>
                    {currentProduct.ro_stoc_detailed && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{currentProduct.ro_stoc_detailed}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right side - status badges floating */}
              <div className="absolute top-6 right-6 flex flex-col gap-2">
                <Badge variant="secondary" className="w-fit shadow-sm">
                  {currentProduct.stare_oferta || "Unknown"}
                </Badge>
                {currentProduct.stare_oferta_secundara && (
                  <Badge variant="outline" className="w-fit shadow-sm">
                    {currentProduct.stare_oferta_secundara}
                  </Badge>
                )}
                <Badge variant="secondary" className="w-fit shadow-sm">
                  {currentProduct.stare_stoc || "Unknown"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* PUBLISHING RO */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Publishing - Romania (yli.ro)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ro-url">Site RO URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="ro-url"
                    value={roUrl}
                    onChange={(e) => setRoUrl(e.target.value)}
                    placeholder="https://yli.ro/..."
                    className="h-11 md:h-10"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => handleSaveUrl("site_ro_url", roUrl)}
                    disabled={loading}
                    className="h-11 w-11 md:h-10 md:w-10"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TooltipProvider>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>RO SKU</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This field is managed automatically by system workflows</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-mono text-sm mt-1">{currentProduct.yliro_sku || "Not generated"}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label>RO Description</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This field is managed automatically by system workflows</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm mt-1">{currentProduct.yliro_descriere || "Not generated"}</p>
                </div>
              </TooltipProvider>

              <div>
                <Label>Snapshot Preview</Label>
                {currentProduct.site_ro_snapshot_base64 ? (
                  <div className="mt-2">
                    <a
                      href={roUrl || currentProduct.site_ro_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        key={currentProduct.site_ro_snapshot_base64.substring(0, 50)}
                        src={`data:image/jpeg;base64,${currentProduct.site_ro_snapshot_base64}`}
                        alt="RO Site Snapshot"
                        loading="lazy"
                        decoding="async"
                        className="w-full max-w-[300px] rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No snapshot available</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleRefreshSnapshot("ro")}
                  disabled={loading || !roUrl}
                  className="h-11 md:h-10 flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Snapshot
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setClearSite("ro");
                    setClearDialogOpen(true);
                  }}
                  disabled={loading || !roUrl}
                  className="h-11 md:h-10 flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear RO Data
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* PUBLISHING HU */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Publishing - Hungary (yli.hu)</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hu-url">Site HU URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="hu-url"
                    value={huUrl}
                    onChange={(e) => setHuUrl(e.target.value)}
                    placeholder="https://yli.hu/..."
                    className="h-11 md:h-10"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => handleSaveUrl("site_hu_url", huUrl)}
                    disabled={loading}
                    className="h-11 w-11 md:h-10 md:w-10"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TooltipProvider>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>HU SKU</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This field is managed automatically by system workflows</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-mono text-sm mt-1">{currentProduct.ylihu_sku || "Not generated"}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label>HU Description</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This field is managed automatically by system workflows</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm mt-1">{currentProduct.ylihu_descriere || "Not generated"}</p>
                </div>
              </TooltipProvider>

              <div>
                <Label>Snapshot Preview</Label>
                {currentProduct.site_hu_snapshot_base64 ? (
                  <div className="mt-2">
                    <a
                      href={huUrl || currentProduct.site_hu_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        key={currentProduct.site_hu_snapshot_base64.substring(0, 50)}
                        src={`data:image/jpeg;base64,${currentProduct.site_hu_snapshot_base64}`}
                        alt="HU Site Snapshot"
                        loading="lazy"
                        decoding="async"
                        className="w-full max-w-[300px] rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No snapshot available</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleRefreshSnapshot("hu")}
                  disabled={loading || !huUrl}
                  className="h-11 md:h-10 flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Snapshot
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setClearSite("hu");
                    setClearDialogOpen(true);
                  }}
                  disabled={loading || !huUrl}
                  className="h-11 md:h-10 flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear HU Data
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* VALIDATION */}
          {isAdmin && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Validation</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="validate"
                    checked={validated}
                    onCheckedChange={handleValidate}
                    disabled={loading}
                  />
                  <Label htmlFor="validate" className="cursor-pointer">
                    Product Validated
                  </Label>
                </div>
                {validated && <Check className="h-5 w-5 text-success" />}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear {clearSite?.toUpperCase()} Product Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the {clearSite?.toUpperCase()} website URL, snapshot, SKU, and description.
              The product will also be marked as not validated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearUrls}>Clear Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
