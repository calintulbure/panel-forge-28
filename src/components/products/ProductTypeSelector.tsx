import { useState, useEffect, useRef } from "react";
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
import { useProductTypes, ProductType } from "@/hooks/useProductTypes";
import { useToast } from "@/hooks/use-toast";

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
  const [isCreating, setIsCreating] = useState(false);
  const { types, loading, fetchTypes, createType } = useProductTypes();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch types when popover opens
  useEffect(() => {
    if (open) {
      fetchTypes();
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

  const selectedType = types.find((t) => t.id === value);
  const displayName = selectedType?.denumire || currentTypeName || "";

  const handleSelect = (type: ProductType) => {
    onChange(type.id, type.denumire);
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
    const created = await createType(newTypeName.trim());
    setIsCreating(false);

    if (created) {
      onChange(created.id, created.denumire);
      setShowAddNew(false);
      setNewTypeName("");
      setOpen(false);
    }
  };

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
      <PopoverContent className="w-[250px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search types..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-2 text-center text-sm">
                    No type found.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => {
                        setNewTypeName(search);
                        setShowAddNew(true);
                      }}
                    >
                      Add "{search}"?
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem onSelect={handleClear} className="text-muted-foreground">
                      <span>Clear selection</span>
                    </CommandItem>
                  )}
                  {types.map((type) => (
                    <CommandItem
                      key={type.id}
                      value={type.denumire}
                      onSelect={() => handleSelect(type)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === type.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {type.denumire}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup>
              {showAddNew ? (
                <div className="flex items-center gap-2 p-2">
                  <Input
                    ref={inputRef}
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="New type name..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
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
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAddNew}
                    disabled={!newTypeName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
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
