import { useState, useEffect, useMemo } from "react";
import { useProductTypes, ProductType } from "@/hooks/useProductTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = "tipprodus_id" | "tipprodus_cod" | "tipprodus_descriere" | "tipprodus_level" | "tipprodusmain_descr" | "countproduse";
type SortDirection = "asc" | "desc";

export default function ProductTypes() {
  const { types, loading, fetchTypes, createType, updateType, deleteType, importFromRemote, fetchAllMainTypes } = useProductTypes();
  const [importing, setImporting] = useState(false);
  const [allMainTypes, setAllMainTypes] = useState<ProductType[]>([]);

  const handleImport = async () => {
    setImporting(true);
    await importFromRemote();
    setImporting(false);
  };
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [parentFilter, setParentFilter] = useState<string>("all");
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState<"main" | "sub">("main");
  const [editMainType, setEditMainType] = useState<ProductType | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeLevel, setNewTypeLevel] = useState<"main" | "sub">("main");
  const [newMainType, setNewMainType] = useState<ProductType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductType | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tipprodus_descriere");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch all main types for dialogs (independent of filters)
  useEffect(() => {
    const loadAllMainTypes = async () => {
      const mainTypes = await fetchAllMainTypes();
      setAllMainTypes(mainTypes);
    };
    loadAllMainTypes();
  }, [fetchAllMainTypes]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const mainId = parentFilter !== "all" ? parseInt(parentFilter) : undefined;
      fetchTypes(search, levelFilter === "all" ? undefined : levelFilter, mainId);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, levelFilter, parentFilter, fetchTypes]);

  // Sorted types
  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortField) {
        case "tipprodus_id":
          aVal = a.tipprodus_id;
          bVal = b.tipprodus_id;
          break;
        case "tipprodus_cod":
          aVal = a.tipprodus_cod || "";
          bVal = b.tipprodus_cod || "";
          break;
        case "tipprodus_descriere":
          aVal = a.tipprodus_descriere;
          bVal = b.tipprodus_descriere;
          break;
        case "tipprodus_level":
          aVal = a.tipprodus_level;
          bVal = b.tipprodus_level;
          break;
        case "tipprodusmain_descr":
          aVal = a.tipprodusmain_descr || "";
          bVal = b.tipprodusmain_descr || "";
          break;
        case "countproduse":
          aVal = a.countproduse;
          bVal = b.countproduse;
          break;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal || "").toLowerCase();
      const strB = String(bVal || "").toLowerCase();
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [types, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleCreate = async () => {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const result = await createType(
      newTypeName.trim(),
      newTypeLevel,
      newTypeLevel === "sub" ? newMainType?.tipprodus_id : undefined,
      newTypeLevel === "sub" ? newMainType?.tipprodus_descriere : undefined
    );
    setSaving(false);
    if (result) {
      setIsAddDialogOpen(false);
      setNewTypeName("");
      setNewTypeLevel("main");
      setNewMainType(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingType || !editName.trim()) return;
    setSaving(true);
    const result = await updateType(
      editingType.tipprodus_id, 
      editName.trim(),
      editLevel,
      editLevel === "sub" ? editMainType?.tipprodus_id : null,
      editLevel === "sub" ? editMainType?.tipprodus_descriere : null
    );
    setSaving(false);
    if (result) {
      setEditingType(null);
      setEditName("");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deleteType(deleteConfirm.tipprodus_id);
    if (result) {
      setDeleteConfirm(null);
    }
  };

  const openEditDialog = (type: ProductType) => {
    setEditingType(type);
    setEditName(type.tipprodus_descriere);
    setEditLevel(type.tipprodus_level as "main" | "sub");
    if (type.tipprodusmain_id) {
      const parent = allMainTypes.find(t => t.tipprodus_id === type.tipprodusmain_id);
      setEditMainType(parent || null);
    } else {
      setEditMainType(null);
    }
  };

  // Get unique parent types for filter dropdown
  const parentOptions = useMemo(() => {
    const parents = new Map<number, string>();
    types.forEach(t => {
      if (t.tipprodusmain_id && t.tipprodusmain_descr) {
        parents.set(t.tipprodusmain_id, t.tipprodusmain_descr);
      }
    });
    return Array.from(parents.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [types]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-foreground">Product Types</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Import from Remote
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="main">Main Only</SelectItem>
            <SelectItem value="sub">Sub Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={parentFilter} onValueChange={setParentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parents</SelectItem>
            {parentOptions.map(([id, name]) => (
              <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 cursor-pointer" onClick={() => handleSort("tipprodus_id")}>
                  <div className="flex items-center">ID<SortIcon field="tipprodus_id" /></div>
                </TableHead>
                <TableHead className="w-32 cursor-pointer" onClick={() => handleSort("tipprodus_cod")}>
                  <div className="flex items-center">Code<SortIcon field="tipprodus_cod" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("tipprodus_descriere")}>
                  <div className="flex items-center">Description<SortIcon field="tipprodus_descriere" /></div>
                </TableHead>
                <TableHead className="w-24 cursor-pointer" onClick={() => handleSort("tipprodus_level")}>
                  <div className="flex items-center">Level<SortIcon field="tipprodus_level" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("tipprodusmain_descr")}>
                  <div className="flex items-center">Parent<SortIcon field="tipprodusmain_descr" /></div>
                </TableHead>
                <TableHead className="w-24 text-right cursor-pointer" onClick={() => handleSort("countproduse")}>
                  <div className="flex items-center justify-end">Products<SortIcon field="countproduse" /></div>
                </TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No product types found
                  </TableCell>
                </TableRow>
              ) : (
                sortedTypes.map((type) => (
                  <TableRow key={type.tipprodus_id}>
                    <TableCell className="font-mono text-sm">{type.tipprodus_id}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{type.tipprodus_cod || "-"}</TableCell>
                    <TableCell className="font-medium">{type.tipprodus_descriere}</TableCell>
                    <TableCell>
                      <Badge variant={type.tipprodus_level === "main" ? "default" : "secondary"}>
                        {type.tipprodus_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.tipprodusmain_descr || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {type.countproduse}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Type description..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Level</Label>
              <Select value={newTypeLevel} onValueChange={(v) => setNewTypeLevel(v as "main" | "sub")}>
                <SelectTrigger className="mt-1">
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
                <Label>Parent Main Type</Label>
                <Select 
                  value={newMainType?.tipprodus_id?.toString() || ""} 
                  onValueChange={(v) => {
                    const mt = allMainTypes.find(t => t.tipprodus_id.toString() === v);
                    setNewMainType(mt || null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMainTypes.map((mt) => (
                      <SelectItem key={mt.tipprodus_id} value={mt.tipprodus_id.toString()}>
                        {mt.tipprodus_descriere}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newTypeName.trim() || saving || (newTypeLevel === "sub" && !newMainType)}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Type description..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Level</Label>
              <Select value={editLevel} onValueChange={(v) => setEditLevel(v as "main" | "sub")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="sub">Sub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editLevel === "sub" && (
              <div>
                <Label>Parent Main Type</Label>
                <Select 
                  value={editMainType?.tipprodus_id?.toString() || ""} 
                  onValueChange={(v) => {
                    const mt = allMainTypes.find(t => t.tipprodus_id.toString() === v);
                    setEditMainType(mt || null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMainTypes.map((mt) => (
                      <SelectItem key={mt.tipprodus_id} value={mt.tipprodus_id.toString()}>
                        {mt.tipprodus_descriere}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={!editName.trim() || saving || (editLevel === "sub" && !editMainType)}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.tipprodus_descriere}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
