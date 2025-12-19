import { useState, useRef, useCallback, useEffect } from "react";
import { FileText, Globe, Upload, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ResourcesCellProps {
  productCode: string;
  articolId: number | null;
  onUpdate: () => void;
}

export function ResourcesCell({ productCode, articolId, onUpdate }: ResourcesCellProps) {
  const [resourceCount, setResourceCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<"webpage" | "file-url" | "file" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastDropTime = useRef<number>(0);
  const dragLeaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Fetch resource count
  useEffect(() => {
    const fetchResourceCount = async () => {
      if (!articolId) {
        setResourceCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("products_resources")
        .select("*", { count: "exact", head: true })
        .eq("articol_id", articolId);

      if (!error && count !== null) {
        setResourceCount(count);
      }
    };

    fetchResourceCount();
  }, [articolId]);

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

        // Check if resource already exists
        const { data: existing } = await supabase
          .from("products_resources")
          .select("resource_id")
          .eq("articol_id", articolId)
          .eq("url", url)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Already exists",
            description: "This webpage is already added",
          });
          setIsLoading(false);
          return;
        }

        // Insert new resource
        const { error } = await supabase
          .from("products_resources")
          .insert({
            articol_id: articolId,
            erp_product_code: productCode,
            resource_type: "html",
            resource_content: "webpage",
            url: url,
            server: server,
            language: language,
            processed: false,
          });

        if (error) throw error;

        toast({
          title: "Webpage added",
          description: "Resource has been saved",
        });

        setResourceCount((prev) => prev + 1);
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
    [articolId, productCode, onUpdate, toast]
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

      setIsLoading(true);

      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        
        // Determine file type from extension
        let resourceType = "file";
        if (pathname.endsWith(".pdf")) resourceType = "pdf";
        else if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) resourceType = "image";
        else if (pathname.match(/\.(doc|docx)$/)) resourceType = "document";
        else if (pathname.match(/\.(xls|xlsx)$/)) resourceType = "spreadsheet";

        // Check if resource already exists
        const { data: existing } = await supabase
          .from("products_resources")
          .select("resource_id")
          .eq("articol_id", articolId)
          .eq("url", url)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Already exists",
            description: "This file URL is already added",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase
          .from("products_resources")
          .insert({
            articol_id: articolId,
            erp_product_code: productCode,
            resource_type: resourceType,
            resource_content: "file_url",
            url: url,
            server: urlObj.hostname,
            processed: false,
          });

        if (error) throw error;

        toast({
          title: "File URL added",
          description: "Resource has been saved",
        });

        setResourceCount((prev) => prev + 1);
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
    },
    [articolId, productCode, onUpdate, toast]
  );

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
    [articolId, toast]
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
        {/* Resource count - hidden when dragging */}
        {!isDragging && (
          <>
            <div className="font-bold text-xl text-foreground">{resourceCount}</div>
            <div className="text-xs text-muted-foreground">resources</div>
          </>
        )}

        {/* Drop zones - visible only when dragging */}
        {isDragging && (
          <div className="flex flex-col gap-1 w-full">
            {/* Webpage URL drop zone */}
            <div
              className={cn(
                "flex items-center gap-1 p-2 rounded border border-dashed text-xs cursor-pointer transition-colors",
                isDragOver === "webpage" ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50"
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
                isDragOver === "file-url" ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50"
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
                isDragOver === "file" ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50"
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
    </div>
  );
}
