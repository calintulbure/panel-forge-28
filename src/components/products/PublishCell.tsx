import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CandidateSelector } from "./CandidateSelector";

interface PublishCellProps {
  productCode: string;
  productDescription?: string | null;
  snapshotBase64: string | null;
  siteUrl: string | null;
  sku: string | null;
  site: "ro" | "hu";
  onUpdate: () => void;
}

export function PublishCell({ productCode, productDescription, snapshotBase64, siteUrl, sku, site, onUpdate }: PublishCellProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showCandidateSelector, setShowCandidateSelector] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const lastDropTime = useRef<number>(0);
  const { toast } = useToast();

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!siteUrl) {
      toast({
        title: "No URL",
        description: "Please add a URL first by dragging and dropping",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);

    try {
      const { data, error } = await supabase.functions.invoke("trigger-snapshot", {
        body: { productCode, siteUrl, site },
      });

      if (error) throw error;

      toast({
        title: "Snapshot refreshing",
        description: `${site.toUpperCase()} snapshot capture triggered`,
      });

      // Wait a bit then refresh
      setTimeout(onUpdate, 2000);
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh snapshot",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const processUrl = useCallback(
    async (url: string) => {
      // Debounce
      const now = Date.now();
      if (now - lastDropTime.current < 500) {
        return;
      }
      lastDropTime.current = now;

      try {
        const urlObj = new URL(url);
        const expectedDomain = `yli.${site}`;

        if (!urlObj.hostname.endsWith(expectedDomain)) {
          toast({
            title: "Invalid URL",
            description: `Please drop a ${expectedDomain} link`,
            variant: "destructive",
          });
          return;
        }

        setIsRefreshing(true);

        // Update the site URL in the database
        const updateField = site === "ro" ? "site_ro_url" : "site_hu_url";
        const { error: updateError } = await supabase
          .from("products")
          .update({ [updateField]: url })
          .eq("erp_product_code", productCode);

        if (updateError) throw updateError;

        // Trigger snapshot capture
        const { error: snapshotError } = await supabase.functions.invoke("trigger-snapshot", {
          body: { productCode, siteUrl: url, site },
        });

        if (snapshotError) throw snapshotError;

        toast({
          title: "URL updated",
          description: `${site.toUpperCase()} URL saved and snapshot capture triggered`,
        });

        setTimeout(onUpdate, 2000);
      } catch (error) {
        console.error("URL processing error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process URL",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [productCode, site, onUpdate, toast],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const url = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (url) {
      await processUrl(url.trim());
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      await processUrl(urlInput.trim());
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const handleImageClick = () => {
    if (snapshotBase64) {
      setShowImageDialog(true);
    }
  };

  const handleFindMatch = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setIsLoadingCandidates(true);
    setShowCandidateSelector(true);
    setCandidates([]);

    try {
      const { data, error } = await supabase.functions.invoke("match-candidates", {
        body: { 
          erp_product_code: productCode,
          erp_product_description: productDescription,
          website: site 
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Search failed",
          description: data.error || "Failed to find candidates",
          variant: "destructive",
        });
        setCandidates([]);
        return;
      }

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
      } else {
        toast({
          title: "No matches found",
          description: "No candidate pages found for this product",
        });
        setCandidates([]);
      }
    } catch (error) {
      console.error("Find match error:", error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to search for candidates",
        variant: "destructive",
      });
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleConfirmCandidate = async (candidate: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("choose-candidate", {
        body: {
          erp_product_code: productCode,
          site,
          candidate,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Update failed",
          description: data.error || "Failed to apply candidate",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Candidate applied",
        description: "Snapshot capture queued",
      });

      setShowCandidateSelector(false);
      setTimeout(onUpdate, 2000);
    } catch (error) {
      console.error("Confirm candidate error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to apply candidate",
        variant: "destructive",
      });
    }
  };

  const handleCancelCandidateSelection = () => {
    setShowCandidateSelector(false);
    setCandidates([]);
  };

  return (
    <div
      className={cn(
        "relative min-h-[120px] p-2 rounded border transition-colors",
        isDragOver && "border-primary bg-primary/5",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFocus={() => setShowUrlInput(true)}
      onBlur={() => {
        setTimeout(() => setShowUrlInput(false), 200);
      }}
      tabIndex={0}
      role="button"
      aria-label={`${site.toUpperCase()} publish cell for product ${productCode}`}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Snapshot thumbnail with hover preview */}
        <div className="relative group">
          <div
            className={cn(
              "relative w-[80px] h-[80px] rounded border bg-muted flex items-center justify-center overflow-hidden",
              snapshotBase64 && "cursor-pointer hover:opacity-80 transition-opacity",
            )}
            onClick={handleImageClick}
          >
            {isRefreshing ? (
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : snapshotBase64 ? (
              <>
                <img
                  src={`data:image/jpeg;base64,${snapshotBase64}`}
                  alt={`${site.toUpperCase()} snapshot`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">No snapshot</span>
            )}

            {/* Action buttons overlay */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6"
                onClick={handleFindMatch}
                disabled={isRefreshing || isLoadingCandidates}
                title="Find candidate pages"
              >
                <Search className="h-3 w-3" />
              </Button>
              {siteUrl && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh snapshot"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Hover preview */}
          {snapshotBase64 && (
            <div className="absolute top-full right-0 mt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-[400px] h-[300px] border-2 border-primary rounded shadow-lg bg-background overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${snapshotBase64}`}
                  alt={`${site.toUpperCase()} snapshot preview`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* SKU display */}
        <div className="text-xs font-mono text-center text-muted-foreground">{sku || "-"}</div>

        {/* URL input for keyboard users */}
        {showUrlInput && (
          <form onSubmit={handleUrlSubmit} className="w-full px-1">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={`Paste yli.${site} URL`}
              className="w-full text-xs px-2 py-1 rounded border bg-background"
              aria-label={`URL input for ${site.toUpperCase()} site`}
            />
          </form>
        )}

        {/* Drag hint */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded pointer-events-none">
            <span className="text-xs font-medium text-primary">Drop yli.{site} link here</span>
          </div>
        )}
      </div>

      {/* ARIA live region for announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isRefreshing && `Refreshing ${site.toUpperCase()} snapshot`}
      </div>

      {/* Full-size image dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative w-full h-[50vh] bg-black">
            <img
              src={`data:image/jpeg;base64,${snapshotBase64}`}
              alt={`${site.toUpperCase()} Snapshot - ${productCode}`}
              className="w-full h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowImageDialog(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate selector dialog */}
      <CandidateSelector
        open={showCandidateSelector}
        onOpenChange={setShowCandidateSelector}
        candidates={candidates}
        isLoading={isLoadingCandidates}
        onConfirm={handleConfirmCandidate}
        onCancel={handleCancelCandidateSelection}
        site={site}
      />
    </div>
  );
}
