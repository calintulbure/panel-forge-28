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
  onlyValidated: boolean;
  setOnlyValidated: (value: boolean) => void;
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
  onlyValidated,
  setOnlyValidated,
  categories,
}: ProductFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="ERP code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category1">Category 1</Label>
            <Select value={category1} onValueChange={setCategory1}>
              <SelectTrigger id="category1">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.categ1.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category2">Category 2</Label>
            <Select value={category2} onValueChange={setCategory2}>
              <SelectTrigger id="category2">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.categ2.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category3">Category 3</Label>
            <Select value={category3} onValueChange={setCategory3}>
              <SelectTrigger id="category3">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.categ3.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerStatus">Offer Status</Label>
            <Select value={offerStatus} onValueChange={setOfferStatus}>
              <SelectTrigger id="offerStatus">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {categories.offerStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stockStatus">Stock Status</Label>
            <Select value={stockStatus} onValueChange={setStockStatus}>
              <SelectTrigger id="stockStatus">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {categories.stockStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 self-end pb-1">
            <Switch
              id="validated"
              checked={onlyValidated}
              onCheckedChange={setOnlyValidated}
            />
            <Label htmlFor="validated" className="cursor-pointer">
              Only validated
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
