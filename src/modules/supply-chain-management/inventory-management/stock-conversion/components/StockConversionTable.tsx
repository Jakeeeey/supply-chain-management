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
import { Filter, Cuboid } from "lucide-react";

interface StockConversionTableProps {
  data: StockConversionProduct[];
  onConvertClick: (product: StockConversionProduct) => void;
}

export function StockConversionTable({ data, onConvertClick }: StockConversionTableProps) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");

  const uniqueBrands = useMemo(() => Array.from(new Set(data.map(d => d.brand))), [data]);
  const uniqueCategories = useMemo(() => Array.from(new Set(data.map(d => d.category))), [data]);
  const uniqueUnits = useMemo(() => Array.from(new Set(data.map(d => d.currentUnit))), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const matchUnit = unitFilter === "all" || item.currentUnit === unitFilter;
      return matchBrand && matchCat && matchUnit;
    });
  }, [data, brandFilter, categoryFilter, unitFilter]);

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
            <CardTitle className="text-xl font-semibold tracking-tight">Stock Conversion Management</CardTitle>
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
                <SelectTrigger className="w-[180px] bg-background">
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
        <div className="flex items-center justify-end space-x-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
        
      </CardContent>
    </Card>
  );
}
