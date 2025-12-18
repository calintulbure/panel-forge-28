import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProductTypes, ProductType } from "@/hooks/useProductTypes";

interface ProductTypeSelectorProps {
  value: number | null;
  currentTypeName?: string;
  onChange: (typeId: number | null, typeName: string | null) => void;
  disabled?: boolean;
}

export function ProductTypeSelector({
  value,
  currentTypeName,
  onChange,
  disabled,
}: ProductTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeLevel, setNewTypeLevel] = useState<"main" | "sub">("sub");
  const [selectedMainType, setSelectedMainType] = useState<ProductType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mainTypes, setMainTypes] = useState<ProductType[]>([]);
  const { types, loading, fetchTypes, createType } = useProductTypes();

  // Fetch types when popover opens
  useEffect(() => {
    if (open) {
      fetchTypes();
      // Also fetch main types for the add new form
      fetchTypes("", "main").then(setMainTypes);
    }
  }, [open, fetchTypes]);

  // Search with debounce
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchTypes(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchTypes]);

  const selectedType = types.find((t) => t.tipprodus_id === value);
  const displayName = selectedType?.tipprodus_descriere || currentTypeName || "";

  const handleSelect = (type: ProductType) => {
    onChange(type.tipprodus_id, type.tipprodus_descriere);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null, null);
    setOpen(false);
    setSearch("");
  };

  const handleAddNew = async () => {
    if (!newTypeName.trim()) return;
    
    setIsCreating(true);
    const created = await createType(
      newTypeName.trim(),
      newTypeLevel,
      newTypeLevel === "sub" ? selectedMainType?.tipprodus_id : undefined,
      newTypeLevel === "sub" ? selectedMainType?.tipprodus_descriere : undefined
    );
    setIsCreating(false);

    if (created) {
      onChange(created.tipprodus_id, created.tipprodus_descriere);
      setShowAddNew(false);
      setNewTypeName("");
      setNewTypeLevel("sub");
      setSelectedMainType(null);
      setOpen(false);
    }
  };

  // Group types by main/sub for display
  const mainTypesDisplay = types.filter(t => t.tipprodus_level === "main");
  const subTypesDisplay = types.filter(t => t.tipprodus_level === "sub");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-8 text-xs font-normal",
            !displayName && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {displayName || "Select type..."}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search types..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {types.length === 0 && (
                  <CommandEmpty>
                    <div className="py-2 text-center text-sm">
                      No type found.
                    </div>
                  </CommandEmpty>
                )}
                
                {value && (
                  <CommandGroup>
                    <CommandItem onSelect={handleClear} className="text-muted-foreground">
                      <span>Clear selection</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {mainTypesDisplay.length > 0 && (
                  <CommandGroup heading="Main Types">
                    {mainTypesDisplay.map((type) => (
                      <CommandItem
                        key={type.tipprodus_id}
                        value={type.tipprodus_descriere}
                        onSelect={() => handleSelect(type)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === type.tipprodus_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium">{type.tipprodus_descriere}</span>
                        {type.countproduse !== null && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            ({type.countproduse})
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {subTypesDisplay.length > 0 && (
                  <CommandGroup heading="Sub Types">
                    {subTypesDisplay.map((type) => (
                      <CommandItem
                        key={type.tipprodus_id}
                        value={type.tipprodus_descriere}
                        onSelect={() => handleSelect(type)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === type.tipprodus_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{type.tipprodus_descriere}</span>
                          {type.tipprodusmain_descr && (
                            <span className="text-xs text-muted-foreground">
                              ↳ {type.tipprodusmain_descr}
                            </span>
                          )}
                        </div>
                        {type.countproduse !== null && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            ({type.countproduse})
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
            <CommandSeparator />
            <CommandGroup>
              {showAddNew ? (
                <div className="p-2 space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="Type name..."
                      className="h-8 text-sm mt-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTypeLevel === "main") {
                          e.preventDefault();
                          handleAddNew();
                        }
                        if (e.key === "Escape") {
                          setShowAddNew(false);
                          setNewTypeName("");
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Level</Label>
                    <Select 
                      value={newTypeLevel} 
                      onValueChange={(v) => setNewTypeLevel(v as "main" | "sub")}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main</SelectItem>
                        <SelectItem value="sub">Sub</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newTypeLevel === "sub" && (
                    <div>
                      <Label className="text-xs">Parent Main Type</Label>
                      <Select 
                        value={selectedMainType?.tipprodus_id?.toString() || ""} 
                        onValueChange={(v) => {
                          const mt = mainTypes.find(t => t.tipprodus_id.toString() === v);
                          setSelectedMainType(mt || null);
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue placeholder="Select main type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mainTypes.map((mt) => (
                            <SelectItem key={mt.tipprodus_id} value={mt.tipprodus_id.toString()}>
                              {mt.tipprodus_descriere}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1"
                      onClick={() => {
                        setShowAddNew(false);
                        setNewTypeName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 flex-1"
                      onClick={handleAddNew}
                      disabled={!newTypeName.trim() || isCreating || (newTypeLevel === "sub" && !selectedMainType)}
                    >
                      {isCreating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <CommandItem
                  onSelect={() => {
                    setShowAddNew(true);
                    setNewTypeName(search);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new type
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
