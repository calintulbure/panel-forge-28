import { useState, useRef, useCallback, useEffect } from "react";
import { Globe, Upload, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ResourcesListDialog } from "./ResourcesListDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertRemoteResource } from "@/hooks/useRemoteResources";

const RESOURCE_CONTENT_TYPES = [
  { value: "datasheet", label: "Datasheet" },
  { value: "manual", label: "Manual" },
  { value: "certificate", label: "Certificate" },
  { value: "quickstart", label: "Quick Start Guide" },
  { value: "brochure", label: "Brochure" },
  { value: "software", label: "Software" },
  { value: "specs", label: "Specifications" },
  { value: "application", label: "Application Note" },
  { value: "image", label: "Image" },
  { value: "other", label: "Other" },
];

interface ResourcesCellProps {
  productCode: string;
  articolId: number | null;
  resourceCount?: number; // Use cached count from products table
  resourceUnprocessedCount?: number; // Count of unprocessed resources
  onUpdate: () => void;
}

export function ResourcesCell({
  productCode,
  articolId,
  resourceCount: initialCount,
  resourceUnprocessedCount,
  onUpdate,
}: ResourcesCellProps) {
  const [resourceCount, setResourceCount] = useState<number>(initialCount ?? 0);
  const [unprocessedCount, setUnprocessedCount] = useState<number>(resourceUnprocessedCount ?? 0);
  const [isDragOver, setIsDragOver] = useState<"webpage" | "file-url" | "file" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResourcesList, setShowResourcesList] = useState(false);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string>("other");
  const lastDropTime = useRef<number>(0);
  const dragLeaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Sync with props when they change
  useEffect(() => {
    if (initialCount !== undefined) {
      setResourceCount(initialCount);
    }
  }, [initialCount]);

  useEffect(() => {
    if (resourceUnprocessedCount !== undefined) {
      setUnprocessedCount(resourceUnprocessedCount);
    }
  }, [resourceUnprocessedCount]);

  const processWebpageUrl = useCallback(
    async (url: string) => {
      const now = Date.now();
      if (now - lastDropTime.current < 500) return;
      lastDropTime.current = now;

      if (!articolId) {
        toast({
          title: "Error",
          description: "Product has no articol_id",
          variant: "destructive",
        });
        return;
      }

      try {
        new URL(url); // Validate URL
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please provide a valid URL",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        // Determine server from URL
        const urlObj = new URL(url);
        let server = urlObj.hostname;
        let language = null;

        if (urlObj.hostname.includes("yli.ro")) {
          server = "yli.ro";
          language = "ro";
        } else if (urlObj.hostname.includes("yli.hu")) {
          server = "yli.hu";
          language = "hu";
        }

        // Insert directly to remote
        const result = await insertRemoteResource({
          articol_id: articolId,
          erp_product_code: productCode,
          resource_type: "html",
          resource_content: "webpage",
          url: url,
          server: server,
          language: language,
          processed: false,
        });

        if (!result.success) {
          if (result.error?.includes("already exists")) {
            toast({
              title: "Already exists",
              description: "This webpage is already added",
            });
            setIsLoading(false);
            return;
          }
          throw new Error(result.error);
        }

        toast({
          title: "Webpage added",
          description: "Resource has been saved to remote",
        });

        setResourceCount((prev) => prev + 1);
        setUnprocessedCount((prev) => prev + 1);
        onUpdate();
      } catch (error) {
        console.error("Error adding webpage:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add webpage",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [articolId, productCode, onUpdate, toast],
  );

  const processFileUrl = useCallback(
    async (url: string) => {
      const now = Date.now();
      if (now - lastDropTime.current < 500) return;
      lastDropTime.current = now;

      if (!articolId) {
        toast({
          title: "Error",
          description: "Product has no articol_id",
          variant: "destructive",
        });
        return;
      }

      try {
        new URL(url);
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please provide a valid URL",
          variant: "destructive",
        });
        return;
      }

      // Guess initial type from URL
      const pathname = url.toLowerCase();
      let guessedType = "other";
      if (pathname.includes("datasheet")) guessedType = "datasheet";
      else if (pathname.includes("manual")) guessedType = "manual";
      else if (pathname.includes("certificate")) guessedType = "certificate";
      else if (pathname.includes("brochure")) guessedType = "brochure";
      else if (pathname.includes("spec")) guessedType = "specs";
      else if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) guessedType = "image";
      else if (pathname.match(/\.(exe|zip|rar|msi)/)) guessedType = "software";

      setSelectedContentType(guessedType);
      setPendingFileUrl(url);
    },
    [articolId, toast],
  );

  const confirmFileUrl = async () => {
    if (!pendingFileUrl || !articolId) return;

    setIsLoading(true);

    try {
      const urlObj = new URL(pendingFileUrl);

      // Insert directly to remote
      const result = await insertRemoteResource({
        articol_id: articolId,
        erp_product_code: productCode,
        resource_type: "file_url",
        resource_content: selectedContentType,
        url: pendingFileUrl,
        server: urlObj.hostname,
        processed: false,
      });

      if (!result.success) {
        if (result.error?.includes("already exists")) {
          toast({
            title: "Already exists",
            description: "This file URL is already added",
          });
          setPendingFileUrl(null);
          setIsLoading(false);
          return;
        }
        throw new Error(result.error);
      }

      toast({
        title: "File URL added",
        description: "Resource has been saved to remote",
      });

      setResourceCount((prev) => prev + 1);
      setUnprocessedCount((prev) => prev + 1);
      setPendingFileUrl(null);
      onUpdate();
    } catch (error) {
      console.error("Error adding file URL:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add file URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!articolId) {
        toast({
          title: "Error",
          description: "Product has no articol_id",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Coming soon",
        description: "File upload will be implemented later",
      });
    },
    [articolId, toast],
  );

  const handleDragOver = (e: React.DragEvent, zone: "webpage" | "file-url" | "file") => {
    e.preventDefault();
    e.stopPropagation();
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
      dragLeaveTimeout.current = null;
    }
    setIsDragging(true);
    setIsDragOver(zone);
  };

  const handleContainerDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
      dragLeaveTimeout.current = null;
    }
    setIsDragging(true);
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use timeout to prevent flickering when moving between zones
    dragLeaveTimeout.current = setTimeout(() => {
      setIsDragging(false);
      setIsDragOver(null);
    }, 50);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, zone: "webpage" | "file-url" | "file") => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(null);
    setIsDragging(false);
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
      dragLeaveTimeout.current = null;
    }

    if (zone === "file") {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFileUpload(files);
      }
      return;
    }

    const url = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (url) {
      if (zone === "webpage") {
        await processWebpageUrl(url.trim());
      } else if (zone === "file-url") {
        await processFileUrl(url.trim());
      }
    }
  };

  return (
    <div
      className="relative min-h-[120px] p-2 rounded border transition-colors"
      onDragEnter={handleContainerDragEnter}
      onDragLeave={handleContainerDragLeave}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Resource count - hidden when dragging, clickable to open list */}
        {!isDragging && (
          <div
            className="cursor-pointer hover:bg-muted/50 rounded p-2 transition-colors"
            onClick={() => articolId && setShowResourcesList(true)}
          >
            <div className="font-bold text-xl text-foreground text-center">{resourceCount}</div>
            <div className="text-xs text-muted-foreground text-center">resources</div>
            {unprocessedCount > 0 && (
              <div className="text-xs text-muted-foreground text-center">({unprocessedCount} for process)</div>
            )}
          </div>
        )}

        {/* Drop zones - visible only when dragging */}
        {isDragging && (
          <div className="flex flex-col gap-1 w-full">
            {/* Webpage URL drop zone */}
            <div
              className={cn(
                "flex items-center gap-1 p-2 rounded border border-dashed text-xs cursor-pointer transition-colors",
                isDragOver === "webpage"
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-muted-foreground/50",
              )}
              onDragOver={(e) => handleDragOver(e, "webpage")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "webpage")}
            >
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">Webpage</span>
            </div>

            {/* File URL drop zone */}
            <div
              className={cn(
                "flex items-center gap-1 p-2 rounded border border-dashed text-xs cursor-pointer transition-colors",
                isDragOver === "file-url"
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-muted-foreground/50",
              )}
              onDragOver={(e) => handleDragOver(e, "file-url")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "file-url")}
            >
              <Link className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">File URL</span>
            </div>

            {/* File upload drop zone */}
            <div
              className={cn(
                "flex items-center gap-1 p-2 rounded border border-dashed text-xs cursor-pointer transition-colors",
                isDragOver === "file"
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-muted-foreground/50",
              )}
              onDragOver={(e) => handleDragOver(e, "file")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "file")}
            >
              <Upload className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">File</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
            <span className="text-xs text-muted-foreground">Saving...</span>
          </div>
        )}
      </div>

      {/* Resources list dialog */}
      {articolId && (
        <ResourcesListDialog
          open={showResourcesList}
          onOpenChange={setShowResourcesList}
          articolId={articolId}
          productCode={productCode}
          onResourceDeleted={() => {
            setResourceCount((prev) => Math.max(0, prev - 1));
            onUpdate();
          }}
        />
      )}

      {/* File URL type selector dialog */}
      <Dialog open={!!pendingFileUrl} onOpenChange={(open) => !open && setPendingFileUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Resource Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground truncate">{pendingFileUrl}</div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingFileUrl(null)}>
              Cancel
            </Button>
            <Button onClick={confirmFileUrl} disabled={isLoading}>
              {isLoading ? "Saving..." : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
