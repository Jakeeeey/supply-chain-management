"use client";

import * as React from "react";
import type { Branch, StockMovement } from "../types";
import type { VehiclePart } from "../../registration/types";
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
import { ArrowDownLeft, Inbox, Building2 } from "lucide-react";

interface StockInTableProps {
  movements: StockMovement[];
  branches?: Branch[];
  loading: boolean;
}

export function StockInTable({ movements, branches = [], loading }: StockInTableProps) {
  const branchMap = React.useMemo(() => {
    const map = new Map<number | string, string>();
    branches.forEach((b) => {
      map.set(b.id, b.branch_name);
      map.set(String(b.id), b.branch_name);
    });
    return map;
  }, [branches]);

  if (loading && movements.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-semibold">No stock-in transactions found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click "Stock In Items" to record newly delivered supplies.
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
            <TableHead className="w-[130px]">Reference No.</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Part Code & Name</TableHead>
            <TableHead className="text-right">Qty Received</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-center">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => {
            const part = typeof m.part_id === "object" && m.part_id !== null ? (m.part_id as VehiclePart) : null;
            const partCode = part?.part_code || (typeof m.part_id === "number" ? `Part #${m.part_id}` : "—");
            const partName = part?.part_name || "—";
            const unit = part?.unit || "pc";

            const branchObj = typeof m.branch_id === "object" && m.branch_id !== null ? (m.branch_id as Branch) : null;
            const branchName =
              branchObj?.branch_name ||
              (m.branch_id ? branchMap.get(m.branch_id as number) : null) ||
              "Main Branch";

            const totalAmount = Number(m.quantity || 0) * Number(m.unit_cost || 0);
            const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString() : "—";

            return (
              <TableRow key={m.id}>
                <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                <TableCell className="font-mono text-xs font-semibold">{m.reference_no}</TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{branchName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono font-medium">{partCode}</div>
                  <div className="text-xs font-normal text-muted-foreground">{partName}</div>
                </TableCell>
                <TableCell className="text-right font-semibold text-sm">
                  <span className="text-emerald-600 font-bold">+{m.quantity}</span>{" "}
                  <span className="text-xs text-muted-foreground font-normal">{unit}</span>
                </TableCell>
                <TableCell className="text-right font-medium text-xs">
                  ₱{Number(m.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold text-xs">
                  ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                  {m.remarks || "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[11px] gap-1">
                    <ArrowDownLeft className="h-3 w-3" />
                    Stock In
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
