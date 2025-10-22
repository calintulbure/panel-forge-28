import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Table as TableIcon, Upload, Plus, Trash2, Edit, Play, Download, Search, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DatabaseManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [showSchemaDialog, setShowSchemaDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData();
      loadTableSchema();
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      // Get tables by querying information_schema
      const { data, error } = await supabase.rpc('get_tables' as any);
      
      if (error) {
        // Fallback: use hardcoded list of known tables
        setTables(['products', 'user_roles']);
        return;
      }
      
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
      // Use fallback tables
      setTables(['products', 'user_roles']);
    }
  };

  const loadTableData = async () => {
    if (!selectedTable) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedTable as any)
        .select('*')
        .limit(100);

      if (error) throw error;

      setTableData(data || []);
      
      // Extract column names
      if (data && data.length > 0) {
        setTableColumns(Object.keys(data[0]));
      } else {
        setTableColumns([]);
      }
    } catch (error) {
      console.error("Error loading table data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load table data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedTable || !bulkData.trim()) {
      toast({
        title: "Error",
        description: "Please select a table and provide data",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = JSON.parse(bulkData);
      const dataArray = Array.isArray(data) ? data : [data];

      const { error } = await supabase
        .from(selectedTable as any)
        .insert(dataArray as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${dataArray.length} rows into ${selectedTable}`,
      });

      setBulkData("");
      loadTableData();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteSQL = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a SQL query",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Note: Direct SQL execution requires a custom RPC function
      toast({
        title: "Info",
        description: "Direct SQL execution requires database function setup. Use the table operations instead.",
        variant: "default",
      });
    } catch (error) {
      console.error("SQL error:", error);
      toast({
        title: "Query failed",
        description: error instanceof Error ? error.message : "Failed to execute query",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRow = async () => {
    if (!selectedTable) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .insert([formData as any]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Row added successfully",
      });

      setShowAddDialog(false);
      setFormData({});
      loadTableData();
    } catch (error) {
      console.error("Add error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add row",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRow = async () => {
    if (!selectedTable || !editingRow) return;

    setIsLoading(true);
    try {
      // Find the primary key column (usually 'id' or ends with '_id')
      const pkColumn = tableColumns.find(col => col === 'id' || col.endsWith('_id')) || tableColumns[0];
      
      // Cast to any to avoid TypeScript depth issues with dynamic tables
      const supabaseQuery = supabase.from(selectedTable as any) as any;
      const { error } = await supabaseQuery
        .update(formData)
        .eq(pkColumn, editingRow[pkColumn]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Row updated successfully",
      });

      setShowEditDialog(false);
      setEditingRow(null);
      setFormData({});
      loadTableData();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update row",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRow = async (row: any) => {
    if (!selectedTable || !confirm("Are you sure you want to delete this row?")) return;

    setIsLoading(true);
    try {
      const pkColumn = tableColumns.find(col => col === 'id' || col.endsWith('_id')) || tableColumns[0];
      
      // Cast to any to avoid TypeScript depth issues with dynamic tables
      const supabaseQuery = supabase.from(selectedTable as any) as any;
      const { error } = await supabaseQuery
        .delete()
        .eq(pkColumn, row[pkColumn]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Row deleted successfully",
      });

      loadTableData();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete row",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (row: any) => {
    setEditingRow(row);
    setFormData(row);
    setShowEditDialog(true);
  };

  const openAddDialog = () => {
    setFormData({});
    setShowAddDialog(true);
  };

  const loadTableSchema = async () => {
    if (!selectedTable) return;
    
    try {
      // Use Supabase introspection to get table schema
      const { data, error } = await supabase
        .from(selectedTable as any)
        .select('*')
        .limit(0);
      
      // For schema info, we'll use the columns we already have
      // In a full implementation, you'd query information_schema
      setTableSchema(tableColumns.map(col => ({ 
        name: col, 
        type: 'unknown' 
      })));
    } catch (error) {
      console.error("Error loading schema:", error);
    }
  };

  const handleExportData = () => {
    if (!tableData.length) {
      toast({
        title: "No data",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const dataStr = JSON.stringify(tableData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable}_export_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Data exported successfully",
    });
  };

  const filteredData = tableData.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Manager</h1>
        <p className="text-muted-foreground mt-2">
          Full database administration and data management
        </p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">
            <TableIcon className="h-4 w-4 mr-2" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="h-4 w-4 mr-2" />
            Table Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Browser</CardTitle>
              <CardDescription>View and manage table data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Table</label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a table..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table} value={table}>
                          {table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadTableData} disabled={!selectedTable}>
                  Refresh
                </Button>
                <Button onClick={openAddDialog} disabled={!selectedTable}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
                <Button onClick={handleExportData} disabled={!selectedTable || !tableData.length} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {selectedTable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in table data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {selectedTable && (
                <div className="border rounded-lg">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableColumns.map((col) => (
                            <TableHead key={col} className="font-semibold">
                              {col}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tableColumns.length + 1} className="text-center text-muted-foreground">
                              {isLoading ? "Loading..." : searchTerm ? "No matching data found" : "No data found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredData.map((row, idx) => (
                            <TableRow key={idx}>
                              {tableColumns.map((col) => (
                                <TableCell key={col} className="max-w-xs truncate">
                                  {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditDialog(row)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteRow(row)}
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
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>Import multiple rows at once using JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target Table</label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">JSON Data</label>
                <Textarea
                  placeholder='[{"column1": "value1", "column2": "value2"}]'
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="font-mono text-xs min-h-[400px]"
                />
              </div>

              <Button
                onClick={handleBulkImport}
                disabled={isLoading || !selectedTable}
                className="w-full"
              >
                {isLoading ? "Importing..." : "Import Data"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Information</CardTitle>
              <CardDescription>View table structure and statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Table</label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTable && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                        <p className="text-2xl font-bold">{tableData.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Columns</p>
                        <p className="text-2xl font-bold">{tableColumns.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Column Details</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Sample Values</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableColumns.map((col) => (
                          <TableRow key={col}>
                            <TableCell className="font-mono text-sm">{col}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {tableData.length > 0 ? (
                                <span className="truncate block max-w-md">
                                  {String(tableData[0][col] ?? 'null')}
                                </span>
                              ) : (
                                'No data'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm">
                      <strong>Need SQL access?</strong> Click the "Access Database with SQL Editor" button above to open the full database interface where you can run custom SQL queries, modify table structures, and perform advanced operations.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Row Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Row to {selectedTable}</DialogTitle>
            <DialogDescription>Enter values for each column</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {tableColumns.map((col) => (
              <div key={col} className="grid gap-2">
                <label className="text-sm font-medium">{col}</label>
                <Input
                  value={formData[col] || ''}
                  onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                  placeholder={`Enter ${col}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRow} disabled={isLoading}>
              Add Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Row in {selectedTable}</DialogTitle>
            <DialogDescription>Modify values for each column</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {tableColumns.map((col) => (
              <div key={col} className="grid gap-2">
                <label className="text-sm font-medium">{col}</label>
                <Input
                  value={formData[col] || ''}
                  onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                  placeholder={`Enter ${col}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRow} disabled={isLoading}>
              Update Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
