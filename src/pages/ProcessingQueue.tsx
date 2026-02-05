import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Search, Trash2, Play, XCircle, ChevronDown, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  useProcessingQueue,
  useQueueStats,
  useUpdateQueueStatus,
  useDeleteQueueItems,
  useSyncQueueToRemote,
  type QueueFilters,
  type QueueItem,
} from "@/hooks/useProcessingQueue";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "resource", label: "Resources" },
  { value: "document", label: "Documents" },
];

const getStatusBadge = (status: QueueItem['status']) => {
  const config = {
    pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
    processing: { variant: "default" as const, icon: Loader2, label: "Processing" },
    completed: { variant: "outline" as const, icon: CheckCircle, label: "Completed" },
    failed: { variant: "destructive" as const, icon: AlertCircle, label: "Failed" },
    cancelled: { variant: "secondary" as const, icon: XCircle, label: "Cancelled" },
  };

  const { variant, icon: Icon, label } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
};

export default function ProcessingQueue() {
  const [filters, setFilters] = useState<QueueFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading, refetch } = useProcessingQueue(
    {
      ...filters,
      erp_product_code: searchTerm || undefined,
    },
    pageSize,
    page * pageSize
  );
  const { data: stats } = useQueueStats();
  const updateStatus = useUpdateQueueStatus();
  const deleteItems = useDeleteQueueItems();
  const syncToRemote = useSyncQueueToRemote();

  const items = data?.items || [];
  const totalCount = data?.count || 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((item) => item.queue_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkStatusUpdate = async (status: QueueItem['status']) => {
    if (selectedIds.length === 0) return;
    await updateStatus.mutateAsync({ queue_ids: selectedIds, status });
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteItems.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Processing Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => syncToRemote.mutate()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncToRemote.isPending ? 'animate-spin' : ''}`} />
            Sync to Remote
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.by_status.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.by_status.processing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">{stats.by_status.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.by_status.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ERP code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={filters.entity_type || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              entity_type: value === "all" ? undefined : (value as 'resource' | 'document'),
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(filters.status as string) || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value === "all" ? undefined : value,
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions ({selectedIds.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("processing")}>
                <Play className="mr-2 h-4 w-4" />
                Mark as Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("completed")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate("cancelled")}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Queue ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>ERP Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No items in queue
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.queue_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.queue_id)}
                      onCheckedChange={(checked) => handleSelectItem(item.queue_id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.queue_id}</TableCell>
                  <TableCell>
                    <Badge variant={item.entity_type === 'resource' ? 'default' : 'secondary'}>
                      {item.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.entity_id}</TableCell>
                  <TableCell className="font-mono text-sm">{item.erp_product_code || '-'}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.completed_at ? new Date(item.completed_at).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                    {item.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
