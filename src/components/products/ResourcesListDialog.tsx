import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Globe, FileText, Image, File, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

interface Resource {
  resource_id: number;
  resource_type: string;
  resource_content: string | null;
  url: string | null;
  server: string | null;
  language: string | null;
  title: string | null;
  description: string | null;
  url_status: string | null;
  processed: boolean | null;
  created_at: string | null;
}

interface ResourcesListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articolId: number;
  productCode: string;
  onResourceDeleted: () => void;
}

export function ResourcesListDialog({
  open,
  onOpenChange,
  articolId,
  productCode,
  onResourceDeleted,
}: ResourcesListDialogProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && articolId) {
      fetchResources();
    }
  }, [open, articolId]);

  const fetchResources = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("products_resources")
      .select("resource_id, resource_type, resource_content, url, server, language, title, description, url_status, processed, created_at")
      .eq("articol_id", articolId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    } else {
      setResources(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!resourceToDelete) return;

    const { error } = await supabase
      .from("products_resources")
      .delete()
      .eq("resource_id", resourceToDelete.resource_id);

    if (error) {
      console.error("Error deleting resource:", error);
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Resource has been deleted",
      });
      setResources((prev) => prev.filter((r) => r.resource_id !== resourceToDelete.resource_id));
      onResourceDeleted();
    }

    setDeleteDialogOpen(false);
    setResourceToDelete(null);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "html":
        return <Globe className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "pdf":
      case "document":
      case "spreadsheet":
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variant = status === "ok" ? "default" : status === "error" ? "destructive" : "secondary";
    return <Badge variant={variant} className="text-xs">{status}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resources for {productCode}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No resources found</div>
            ) : (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.resource_id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1 text-muted-foreground">
                      {getResourceIcon(resource.resource_type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {resource.resource_type}
                        </Badge>
                        {resource.resource_content && (
                          <Badge variant="outline" className="text-xs">
                            {resource.resource_content}
                          </Badge>
                        )}
                        {resource.language && (
                          <Badge variant="secondary" className="text-xs">
                            {resource.language.toUpperCase()}
                          </Badge>
                        )}
                        {getStatusBadge(resource.url_status)}
                        {resource.processed === true ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Processed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                            Pending
                          </Badge>
                        )}
                      </div>

                      {resource.title && (
                        <div className="font-medium text-sm truncate">{resource.title}</div>
                      )}

                      {resource.url && (
                        <div className="flex items-center gap-1 overflow-hidden">
                          <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                            {resource.url}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 flex-shrink-0"
                            onClick={() => window.open(resource.url!, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {resource.server && (
                        <div className="text-xs text-muted-foreground">
                          Server: {resource.server}
                        </div>
                      )}

                      {resource.created_at && (
                        <div className="text-xs text-muted-foreground">
                          Added: {new Date(resource.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setResourceToDelete(resource);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
