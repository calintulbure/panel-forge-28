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
}: ProductFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="search" className="text-xs">Search</Label>
            <Input
              id="search"
              placeholder="ERP code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 md:h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="category1" className="text-xs">Category 1</Label>
            <Select value={category1} onValueChange={setCategory1}>
              <SelectTrigger id="category1" className="h-11 md:h-9">
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

          <div className="space-y-1">
            <Label htmlFor="category2" className="text-xs">Category 2</Label>
            <Select value={category2} onValueChange={setCategory2}>
              <SelectTrigger id="category2" className="h-11 md:h-9">
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

          <div className="space-y-1">
            <Label htmlFor="category3" className="text-xs">Category 3</Label>
            <Select value={category3} onValueChange={setCategory3}>
              <SelectTrigger id="category3" className="h-11 md:h-9">
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

          <div className="space-y-1">
            <Label htmlFor="offerStatus" className="text-xs">Offer Status</Label>
            <Select value={offerStatus} onValueChange={setOfferStatus}>
              <SelectTrigger id="offerStatus" className="h-11 md:h-9">
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

          <div className="space-y-1">
            <Label htmlFor="stockStatus" className="text-xs">Stock Status</Label>
            <Select value={stockStatus} onValueChange={setStockStatus}>
              <SelectTrigger id="stockStatus" className="h-11 md:h-9">
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

          <div className="space-y-1">
            <Label htmlFor="validationFilter" className="text-xs">Validation</Label>
            <Select value={validationFilter} onValueChange={setValidationFilter}>
              <SelectTrigger id="validationFilter" className="h-11 md:h-9">
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
    </Card>
  );
}
