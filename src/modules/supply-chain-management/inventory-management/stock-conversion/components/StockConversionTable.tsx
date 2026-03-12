"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
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
import { Filter, Cuboid, Layers, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface StockConversionTableProps {
  data: StockConversionProduct[];
  onConvertClick: (product: StockConversionProduct) => void;
}

export function StockConversionTable({ data, onConvertClick }: StockConversionTableProps) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isGrouped, setIsGrouped] = useState(false);

  const uniqueBrands = useMemo(() => Array.from(new Set(data.map(d => d.brand))), [data]);
  const uniqueCategories = useMemo(() => Array.from(new Set(data.map(d => d.category))), [data]);
  const uniqueUnits = useMemo(() => Array.from(new Set(data.map(d => d.currentUnit))), [data]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(data.map(d => d.supplierName || "No Supplier"))), [data]);

  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      const matchBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const matchUnit = unitFilter === "all" || item.currentUnit === unitFilter;
      const matchSupplier = supplierFilter === "all" || (item.supplierName || "No Supplier") === supplierFilter;
      return matchBrand && matchCat && matchUnit && matchSupplier;
    });

    if (isGrouped) {
      // Sort by family so they appear together
      result = [...result].sort((a, b) => (a.family || "").localeCompare(b.family || ""));
    }

    return result;
  }, [data, brandFilter, categoryFilter, unitFilter, supplierFilter, isGrouped]);

  const columns = useMemo(() => getColumns(onConvertClick), [onConvertClick]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Card className="border-none shadow-sm h-full flex flex-col pt-3 bg-background">
      <CardHeader className="flex flex-row items-center justify-between py-4 pb-2">
         <div className="flex items-center gap-2">
            <Cuboid className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-xl font-semibold tracking-tight">Stock Conversion</CardTitle>
         </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-4">
        {/* Filters */}
        <div className="flex items-center gap-4 bg-background p-3 rounded-lg border shadow-sm relative z-20">
           <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
             <Filter className="w-4 h-4" />
             Filters:
           </div>
           
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

           <div className="h-4 w-px bg-border mx-2" />

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

        {/* Table */}
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
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between py-2 border-t mt-auto">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
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
