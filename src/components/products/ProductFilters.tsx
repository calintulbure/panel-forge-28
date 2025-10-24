import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Filter, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  category1: string[];
  setCategory1: (value: string[]) => void;
  category2: string[];
  setCategory2: (value: string[]) => void;
  category3: string[];
  setCategory3: (value: string[]) => void;
  offerStatus: string[];
  setOfferStatus: (value: string[]) => void;
  stockStatus: string[];
  setStockStatus: (value: string[]) => void;
  validationFilter: string;
  setValidationFilter: (value: string) => void;
  categories: {
    categ1: string[];
    categ2: string[];
    categ3: string[];
    offerStatuses: string[];
    stockStatuses: string[];
  };
  availableCateg2: string[];
  availableCateg3: string[];
  onClearFilters: () => void;
  onRefresh: () => void;
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
  availableCateg2,
  availableCateg3,
  onClearFilters,
  onRefresh,
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
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRefresh}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
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
                <MultiSelect
                  options={categories.categ1.map(cat => ({ value: cat, label: cat }))}
                  value={category1}
                  onChange={setCategory1}
                  placeholder="All categories"
                />
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="category2" className="text-xs">Category 2</Label>
                <MultiSelect
                  options={availableCateg2.map(cat => ({ value: cat, label: cat }))}
                  value={category2}
                  onChange={setCategory2}
                  placeholder="All categories"
                />
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="category3" className="text-xs">Category 3</Label>
                <MultiSelect
                  options={availableCateg3.map(cat => ({ value: cat, label: cat }))}
                  value={category3}
                  onChange={setCategory3}
                  placeholder="All categories"
                />
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="offerStatus" className="text-xs">Offer Status</Label>
                <MultiSelect
                  options={categories.offerStatuses.map(status => ({ value: status, label: status }))}
                  value={offerStatus}
                  onChange={setOfferStatus}
                  placeholder="All statuses"
                />
              </div>

              <div className="space-y-0.5 md:space-y-1">
                <Label htmlFor="stockStatus" className="text-xs">Stock Status</Label>
                <MultiSelect
                  options={categories.stockStatuses.map(status => ({ value: status, label: status }))}
                  value={stockStatus}
                  onChange={setStockStatus}
                  placeholder="All statuses"
                />
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
