"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { StockConversionProduct } from "../types/stock-conversion.schema";
import { getColumns } from "./columns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Cuboid, Layers, Users, RefreshCw, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StockConversionTableProps {
  data: StockConversionProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  onConvertClick: (product: StockConversionProduct) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRefresh: (filters?: any) => void;
  loadProductsInventory: (productIds: number[]) => void;
  isLoading?: boolean;
}

export function StockConversionTable({ 
  data, page, pageSize, setPage, setPageSize,
  onConvertClick, onRefresh, loadProductsInventory, isLoading 
}: StockConversionTableProps) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGrouped, setIsGrouped] = useState(false);

  const uniqueBrands = useMemo(() => Array.from(new Set(data.map(d => d.brand))), [data]);
  const uniqueCategories = useMemo(() => Array.from(new Set(data.map(d => d.category))), [data]);
  const uniqueUnits = useMemo(() => Array.from(new Set(data.map(d => d.currentUnit))), [data]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(data.map(d => d.supplierName || "No Supplier"))), [data]);

  const hasRequiredFilter = supplierFilter !== "all" || brandFilter !== "all" || categoryFilter !== "all" || searchQuery.trim().length >= 3;
  const hasAnyFilter = hasRequiredFilter || unitFilter !== "all" || searchQuery.trim().length > 0;

  const filteredData = useMemo(() => {
    if (!hasRequiredFilter) return [];

    let result = data.filter(item => {
      const matchBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const matchUnit = unitFilter === "all" || item.currentUnit === unitFilter;
      const matchSupplier = supplierFilter === "all" || (item.supplierName || "No Supplier") === supplierFilter;
      
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q.length === 0 || 
        (String(item.productDescription || "").toLowerCase().includes(q)) || 
        (String(item.productCode || "").toLowerCase().includes(q)) ||
        (String(item.supplierName || "").toLowerCase().includes(q)) ||
        (String(item.brand || "").toLowerCase().includes(q)) ||
        (String(item.category || "").toLowerCase().includes(q)) ||
        (String(item.currentUnit || "").toLowerCase().includes(q));

      return matchBrand && matchCat && matchUnit && matchSupplier && matchSearch;
    });

    if (isGrouped) {
      // Sort by family so they appear together
      result = [...result].sort((a, b) => (a.family || "").localeCompare(b.family || ""));
    }

    return result;
  }, [data, brandFilter, categoryFilter, unitFilter, supplierFilter, isGrouped, searchQuery]);

  const columns = useMemo(() => getColumns(onConvertClick, (id: number) => loadProductsInventory([id])), [onConvertClick, loadProductsInventory]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  return (
    <Card className="border-none shadow-sm h-full flex flex-col pt-3 bg-background">
      <CardHeader className="flex flex-row items-center justify-between py-4 pb-2">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Cuboid className="w-5 h-5 text-blue-600" />
               <CardTitle className="text-xl font-semibold tracking-tight">Stock Conversion</CardTitle>
            </div>
            <Button 
               variant="ghost" 
               size="sm" 
               onClick={onRefresh} 
               disabled={isLoading}
               className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
               <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
         </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-background p-3 rounded-lg border shadow-sm relative z-20">
           <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
             <Filter className="w-4 h-4" />
             Filters:
           </div>
           
           <div className="relative w-full sm:w-[250px]">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search product, brand, supplier..."
               className="pl-9 h-9 bg-background focus-visible:ring-1"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>

           <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

           <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Supplier:
              </span>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-background">
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {uniqueSuppliers.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>

           <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Brand:</span>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-background">
                  <SelectItem value="all">All Brands</SelectItem>
                  {uniqueBrands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           
           <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Category:</span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-background">
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           
           <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Unit:</span>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-background">
                  <SelectItem value="all">All Units</SelectItem>
                  {uniqueUnits.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           
           {hasAnyFilter && (
             <Button
               variant="ghost"
               size="sm"
               className="h-8 px-2 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted"
               onClick={() => {
                 setSupplierFilter("all");
                 setBrandFilter("all");
                 setCategoryFilter("all");
                 setUnitFilter("all");
                 setSearchQuery("");
               }}
             >
               Clear
             </Button>
           )}

           <div className="h-4 w-px bg-border mx-2 hidden sm:block" />

           <div className="flex items-center space-x-2">
              <Checkbox 
                id="group-family" 
                checked={isGrouped} 
                onCheckedChange={(checked) => setIsGrouped(!!checked)}
              />
              <Label htmlFor="group-family" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                <Layers className="w-4 h-4 text-blue-500" />
                Group by Family
              </Label>
           </div>
        </div>

        {/* Table Area */}
        {!hasRequiredFilter ? (
          <div className="flex-1 flex flex-col items-center justify-center border rounded-md bg-muted/10 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 shadow-sm">
              <Filter className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2">Select a Filter to Begin</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Please choose a Supplier, Brand, Category, or type at least 3 letters in the Search bar to view specific products for conversion.
            </p>
          </div>
        ) : (
          <div className="rounded-md border bg-background flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold text-muted-foreground uppercase py-3 whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        )}
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between py-2 border-t mt-auto">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
              Page {page} of{" "}
              {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to next page</span>
              {">"}
            </Button>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
}
