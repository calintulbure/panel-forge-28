import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Candidate {
  product_code: string;
  url: string;
  product_id?: number;
  title?: string;
  confidence?: number;
}

interface CandidateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: Candidate[];
  isLoading: boolean;
  onConfirm: (candidate: Candidate) => void;
  onCancel: () => void;
  site: "ro" | "hu";
}

export function CandidateSelector({
  open,
  onOpenChange,
  candidates,
  isLoading,
  onConfirm,
  onCancel,
  site,
}: CandidateSelectorProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    const candidate = candidates.find(c => c.product_code === selectedCandidate);
    if (candidate) {
      setIsConfirming(true);
      try {
        await onConfirm(candidate);
      } finally {
        setIsConfirming(false);
      }
    }
  };

  const handleCancel = () => {
    setSelectedCandidate("");
    onCancel();
  };

  const getHostnameAndPath = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.length > 30 
        ? urlObj.pathname.substring(0, 27) + "..." 
        : urlObj.pathname;
      return `${urlObj.hostname}${path}`;
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Select {site.toUpperCase()} Product Match
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Searching candidates...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No candidates found.</p>
            <p className="text-sm mt-2">Try refining search in n8n.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
              {candidates.map((candidate) => (
                <div
                  key={candidate.product_code}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-4 transition-colors",
                    selectedCandidate === candidate.product_code && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem
                    value={candidate.product_code}
                    id={candidate.product_code}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor={candidate.product_code}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="font-semibold">
                        {candidate.title || candidate.product_code}
                      </span>
                      {candidate.confidence !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(candidate.confidence * 100)}%
                        </Badge>
                      )}
                    </Label>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-mono">
                        {candidate.product_code}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground break-all">
                          {getHostnameAndPath(candidate.url)}
                        </p>
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isConfirming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedCandidate || isConfirming}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Applying...
                  </>
                ) : (
                  "Use This"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
