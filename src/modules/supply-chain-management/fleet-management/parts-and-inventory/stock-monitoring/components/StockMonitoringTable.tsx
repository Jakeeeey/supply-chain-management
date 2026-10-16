"use client";

import * as React from "react";
import type { StockMonitoringItem } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Barcode, Building2, CheckCircle2, AlertTriangle, XCircle, Layers } from "lucide-react";

interface StockMonitoringTableProps {
  items: StockMonitoringItem[];
  loading: boolean;
  viewMode: "branch" | "aggregated";
}

export function StockMonitoringTable({ items, loading, viewMode }: StockMonitoringTableProps) {
  if (loading && items.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-semibold">No stock items match your filter</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust search criteria or register new parts to see inventory levels.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Part Code</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Barcode</TableHead>
              {viewMode === "branch" && <TableHead>Branch</TableHead>}
              <TableHead className="text-right font-semibold">On Hand</TableHead>
              <TableHead className="text-right">Reserved (JO)</TableHead>
              <TableHead className="text-right font-bold text-primary">Available</TableHead>
              <TableHead className="text-right">Reorder Point</TableHead>
              <TableHead className="text-right">Valuation</TableHead>
              <TableHead className="text-center">Stock Health</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              return (
                <TableRow key={`${item.id}-${item.branch_id || "agg"}`}>
                  <TableCell className="font-mono font-medium text-xs">{item.part_code}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.part_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {item.classification_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs cursor-help">
                          <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{item.barcode}</span>
                          {item.barcode_type === "unique" ? (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-sans">
                              Unique
                            </Badge>
                          ) : item.barcode_type === "inherited" ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-sans text-muted-foreground">
                              Inherited
                            </Badge>
                          ) : null}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {item.barcode_type === "unique"
                            ? "Custom barcode"
                            : item.barcode_type === "inherited"
                            ? "Inherited from classification"
                            : "No barcode assigned"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  {viewMode === "branch" && (
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.branch_name}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium text-sm">
                    {item.on_hand} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item.reserved > 0 ? (
                      <span className="text-amber-600 font-semibold">{item.reserved}</span>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-foreground">
                    <span className={item.available <= 0 ? "text-destructive" : item.available <= item.reorder_point ? "text-amber-600" : "text-emerald-600"}>
                      {item.available}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {item.reorder_point}
                  </TableCell>
                  <TableCell className="text-right font-medium text-xs">
                    ₱{item.valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.status === "in_stock" && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        In Stock
                      </Badge>
                    )}
                    {item.status === "low_stock" && (
                      <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-xs gap-1 font-semibold">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Low Stock
                      </Badge>
                    )}
                    {item.status === "out_of_stock" && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <XCircle className="h-3 w-3" />
                        Out of Stock
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
