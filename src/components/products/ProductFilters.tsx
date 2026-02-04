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
import { ProductType } from "@/hooks/useProductTypes";

export const RESOURCES_FILTER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'any', label: 'Any' },
  { value: 'ro_webpage', label: 'RO Webpage' },
  { value: 'hu_webpage', label: 'HU Webpage' },
  { value: 'webpage', label: 'Webpage' },
  { value: 'file_url', label: 'File URL' },
  { value: 'file', label: 'File' },
];

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
  offerStatusSecondary: string[];
  setOfferStatusSecondary: (value: string[]) => void;
  stockStatus: string[];
  setStockStatus: (value: string[]) => void;
  validationFilter: string;
  setValidationFilter: (value: string) => void;
  yliRoSkuFilter: string;
  setYliRoSkuFilter: (value: string) => void;
  yliHuSkuFilter: string;
  setYliHuSkuFilter: (value: string) => void;
  yliRoProdIdFilter: string;
  setYliRoProdIdFilter: (value: string) => void;
  yliHuProdIdFilter: string;
  setYliHuProdIdFilter: (value: string) => void;
  tipProdusFilter: string[];
  setTipProdusFilter: (value: string[]) => void;
  resourcesFilter: string[];
  setResourcesFilter: (value: string[]) => void;
  productTypes: ProductType[];
  showTipProdusNullOption?: boolean;
  categories: {
    categ1: string[];
    categ2: string[];
    categ3: string[];
    offerStatuses: string[];
    offerStatusesSecondary: string[];
    stockStatuses: string[];
  };
  availableCateg2: string[];
  availableCateg3: string[];
  availableOfferStatusSecondary: string[];
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
  offerStatusSecondary,
  setOfferStatusSecondary,
  stockStatus,
  setStockStatus,
  validationFilter,
  setValidationFilter,
  yliRoSkuFilter,
  setYliRoSkuFilter,
  yliHuSkuFilter,
  setYliHuSkuFilter,
  yliRoProdIdFilter,
  setYliRoProdIdFilter,
  yliHuProdIdFilter,
  setYliHuProdIdFilter,
  tipProdusFilter,
  setTipProdusFilter,
  resourcesFilter,
  setResourcesFilter,
  productTypes,
  showTipProdusNullOption = true,
  categories,
  availableCateg2,
  availableCateg3,
  availableOfferStatusSecondary,
  onClearFilters,
  onRefresh,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [isOpen, setIsOpen] = useState(() => {
    // Set initial state based on screen size
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  // Sync local input with prop when cleared externally
  useEffect(() => {
    if (search === '') {
      setSearchInput('');
    }
  }, [search]);

  // Auto-collapse on scroll down
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling down and past a threshold, collapse
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsOpen(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate active filters count and labels
  const getActiveFilters = () => {
    const filters = [];
    if (search) filters.push(`Search: ${search}`);
    if (category1.length > 0) {
      const display = category1.length === 1 ? category1[0] : `${category1[0]} +${category1.length - 1}`;
      filters.push(`Cat1: ${display}`);
    }
    if (category2.length > 0) {
      const display = category2.length === 1 ? category2[0] : `${category2[0]} +${category2.length - 1}`;
      filters.push(`Cat2: ${display}`);
    }
    if (category3.length > 0) {
      const display = category3.length === 1 ? category3[0] : `${category3[0]} +${category3.length - 1}`;
      filters.push(`Cat3: ${display}`);
    }
    if (offerStatus.length > 0) {
      const display = offerStatus.length === 1 ? offerStatus[0] : `${offerStatus[0]} +${offerStatus.length - 1}`;
      filters.push(`Offer: ${display}`);
    }
    if (offerStatusSecondary.length > 0) {
      const display = offerStatusSecondary.length === 1 ? offerStatusSecondary[0] : `${offerStatusSecondary[0]} +${offerStatusSecondary.length - 1}`;
      filters.push(`Offer2: ${display}`);
    }
    if (stockStatus.length > 0) {
      const display = stockStatus.length === 1 ? stockStatus[0] : `${stockStatus[0]} +${stockStatus.length - 1}`;
      filters.push(`Stock: ${display}`);
    }
    if (validationFilter !== 'all') filters.push(`Validation: ${validationFilter}`);
    if (yliRoSkuFilter !== 'all') filters.push(`RO SKU: ${yliRoSkuFilter}`);
    if (yliHuSkuFilter !== 'all') filters.push(`HU SKU: ${yliHuSkuFilter}`);
    if (yliRoProdIdFilter !== 'all') filters.push(`YLIRO PROD ID: ${yliRoProdIdFilter}`);
    if (yliHuProdIdFilter !== 'all') filters.push(`YLIHU PROD ID: ${yliHuProdIdFilter}`);
    if (tipProdusFilter.length > 0) {
      const display = tipProdusFilter.length === 1 
        ? (tipProdusFilter[0] === 'null' ? 'null' : productTypes.find(t => t.tipprodus_id.toString() === tipProdusFilter[0])?.tipprodus_descriere || tipProdusFilter[0])
        : `${productTypes.find(t => t.tipprodus_id.toString() === tipProdusFilter[0])?.tipprodus_descriere || tipProdusFilter[0]} +${tipProdusFilter.length - 1}`;
      filters.push(`Tip Produs: ${display}`);
    }
    if (resourcesFilter.length > 0) {
      const display = resourcesFilter.length === 1 
        ? RESOURCES_FILTER_OPTIONS.find(o => o.value === resourcesFilter[0])?.label || resourcesFilter[0]
        : `${RESOURCES_FILTER_OPTIONS.find(o => o.value === resourcesFilter[0])?.label || resourcesFilter[0]} +${resourcesFilter.length - 1}`;
      filters.push(`Resources: ${display}`);
    }
    return filters;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="sticky top-0 z-10 bg-background pb-4">
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between pt-3 px-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium flex-shrink-0">Filters</span>
              {!isOpen && activeFilters.length > 0 && (
                <div className="flex items-center gap-1 ml-2 overflow-x-auto flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground flex-shrink-0">({activeFilters.length})</span>
                  <div className="flex gap-1 flex-wrap">
                    {activeFilters.map((filter, idx) => (
                      <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded whitespace-nowrap">
                        {filter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRefresh();
                }}
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
                Clear
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4">
              <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <div className="space-y-0.5 md:space-y-1 sm:col-span-2">
                  <Label htmlFor="search" className="text-xs">Search (press Enter)</Label>
                  <Input
                    id="search"
                    placeholder="ERP code or description..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                        setSearch(searchInput);
                      }
                    }}
                    onBlur={() => setSearch(searchInput)}
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
                  <Label htmlFor="offerStatusSecondary" className="text-xs">Offer Status 2</Label>
                  <MultiSelect
                    options={availableOfferStatusSecondary.map(status => ({ value: status, label: status }))}
                    value={offerStatusSecondary}
                    onChange={setOfferStatusSecondary}
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

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="yliRoSkuFilter" className="text-xs">RO SKU</Label>
                  <Select value={yliRoSkuFilter} onValueChange={setYliRoSkuFilter}>
                    <SelectTrigger id="yliRoSkuFilter" className="h-9 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="blank">Blank</SelectItem>
                      <SelectItem value="not_blank">Not blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="yliHuSkuFilter" className="text-xs">HU SKU</Label>
                  <Select value={yliHuSkuFilter} onValueChange={setYliHuSkuFilter}>
                    <SelectTrigger id="yliHuSkuFilter" className="h-9 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="blank">Blank</SelectItem>
                      <SelectItem value="not_blank">Not blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="yliRoProdIdFilter" className="text-xs">YLIRO PROD ID</Label>
                  <Select value={yliRoProdIdFilter} onValueChange={setYliRoProdIdFilter}>
                    <SelectTrigger id="yliRoProdIdFilter" className="h-9 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="null">null</SelectItem>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value=">0">&gt;0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="yliHuProdIdFilter" className="text-xs">YLIHU PROD ID</Label>
                  <Select value={yliHuProdIdFilter} onValueChange={setYliHuProdIdFilter}>
                    <SelectTrigger id="yliHuProdIdFilter" className="h-9 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="null">null</SelectItem>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value=">0">&gt;0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="tipProdusFilter" className="text-xs">Tip Produs</Label>
                  <MultiSelect
                    options={[
                      ...(showTipProdusNullOption ? [{ value: 'null', label: 'null (not assigned)' }] : []),
                      ...productTypes.map(type => ({
                        value: type.tipprodus_id.toString(),
                        label: type.tipprodus_descriere
                      }))
                    ]}
                    value={tipProdusFilter}
                    onChange={setTipProdusFilter}
                    placeholder="All"
                  />
                </div>

                <div className="space-y-0.5 md:space-y-1">
                  <Label htmlFor="resourcesFilter" className="text-xs">Resources</Label>
                  <MultiSelect
                    options={RESOURCES_FILTER_OPTIONS}
                    value={resourcesFilter}
                    onChange={setResourcesFilter}
                    placeholder="All"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
