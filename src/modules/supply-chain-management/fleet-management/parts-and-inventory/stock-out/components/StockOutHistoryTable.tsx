"use client";

import * as React from "react";
import type { OutboundMovement } from "../types";
import type { VehiclePart } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
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
import { ArrowUpRight, FileText } from "lucide-react";

interface StockOutHistoryTableProps {
  items: OutboundMovement[];
  loading: boolean;
}

export function StockOutHistoryTable({ items, loading }: StockOutHistoryTableProps) {
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
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
        <ArrowUpRight className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-sm font-semibold">No outbound movements recorded</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Outbound items from Job Order issuances, scrap write-offs, and damage disposals will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead>Part Code & Name</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Ref / Job Order</TableHead>
            <TableHead className="text-right">Qty Deducted</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Total Outbound</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const part =
              typeof item.part_id === "object" && item.part_id !== null
                ? (item.part_id as VehiclePart)
                : null;
            const partCode = part?.part_code || (typeof item.part_id === "number" ? `Part #${item.part_id}` : "—");
            const partName = part?.part_name || "—";
            const unit = part?.unit || "pc";

            const branch =
              typeof item.branch_id === "object" && item.branch_id !== null
                ? (item.branch_id as Branch)
                : null;
            const branchName = branch?.branch_name || (typeof item.branch_id === "number" ? `Branch #${item.branch_id}` : "—");

            const qty = Number(item.quantity) || 0;
            const cost = Number(item.unit_cost) || 0;
            const total = qty * cost;

            const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : "—";

            // Reference text or JO info
            let refText = item.reference_no || "";
            if (!refText && item.job_order_id) {
              if (typeof item.job_order_id === "object") {
                refText = item.job_order_id.jo_no || `JO #${item.job_order_id.id}`;
              } else {
                refText = `JO #${item.job_order_id}`;
              }
            }

            // Movement badge color
            let badgeClass = "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400";
            if (item.movement_type === "Scrap" || item.movement_type === "Disposal") {
              badgeClass = "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400";
            } else if (item.movement_type === "Damage") {
              badgeClass = "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400";
            } else if (item.movement_type === "Adjustment") {
              badgeClass = "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400";
            }

            return (
              <TableRow key={item.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dateStr}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[11px] font-semibold ${badgeClass}`}>
                    {item.movement_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono font-medium">{partCode}</div>
                  <div className="text-xs text-muted-foreground">{partName}</div>
                </TableCell>
                <TableCell className="text-xs">{branchName}</TableCell>
                <TableCell className="text-xs font-mono">
                  {refText ? (
                    <span className="flex items-center gap-1 font-medium">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {refText}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-sm text-foreground">
                  -{qty} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold">
                  ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {item.remarks || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
