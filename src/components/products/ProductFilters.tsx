import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  category1: string;
  setCategory1: (value: string) => void;
  category2: string;
  setCategory2: (value: string) => void;
  category3: string;
  setCategory3: (value: string) => void;
  offerStatus: string;
  setOfferStatus: (value: string) => void;
  stockStatus: string;
  setStockStatus: (value: string) => void;
  validationFilter: string;
  setValidationFilter: (value: string) => void;
  categories: {
    categ1: string[];
    categ2: string[];
    categ3: string[];
    offerStatuses: string[];
    stockStatuses: string[];
  };
  onClearFilters: () => void;
}

export function ProductFilters({
  search,
  setSearch,
  category1,
  setCategory1,
  category2,
  setCategory2,
  category3,
  setCategory3,
  offerStatus,
  setOfferStatus,
  stockStatus,
  setStockStatus,
  validationFilter,
  setValidationFilter,
  categories,
  onClearFilters,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-collapse on mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between pt-3 px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4">
            <div className="flex items-center justify-between mb-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>
            <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <div className="space-y-0.5 md:space-y-1 sm:col-span-2">
                <Label htmlFor="search" className="text-xs">Search</Label>
                <Input
                  id="search"
                  placeholder="ERP code or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="category1" className="text-xs">Category 1</Label>
                <Select value={category1} onValueChange={setCategory1}>
                  <SelectTrigger id="category1" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.categ1.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="category2" className="text-xs">Category 2</Label>
                <Select value={category2} onValueChange={setCategory2}>
                  <SelectTrigger id="category2" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.categ2.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="category3" className="text-xs">Category 3</Label>
                <Select value={category3} onValueChange={setCategory3}>
                  <SelectTrigger id="category3" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.categ3.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="offerStatus" className="text-xs">Offer Status</Label>
                <Select value={offerStatus} onValueChange={setOfferStatus}>
                  <SelectTrigger id="offerStatus" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.offerStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="stockStatus" className="text-xs">Stock Status</Label>
                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger id="stockStatus" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.stockStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="validationFilter" className="text-xs">Validation</Label>
                <Select value={validationFilter} onValueChange={setValidationFilter}>
                  <SelectTrigger id="validationFilter" className="h-9 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="validated">Validated only</SelectItem>
                    <SelectItem value="not_validated">Not validated only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
