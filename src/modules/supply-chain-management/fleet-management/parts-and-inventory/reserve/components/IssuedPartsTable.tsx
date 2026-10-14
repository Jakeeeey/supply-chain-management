"use client";

import * as React from "react";
import type { JobOrderPart, JobOrderRef, VehicleRef } from "../types";
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
import { Wrench, Layers } from "lucide-react";

interface IssuedPartsTableProps {
  items: JobOrderPart[];
  loading: boolean;
}

export function IssuedPartsTable({ items, loading }: IssuedPartsTableProps) {
  if (loading && items.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-semibold">No parts issued to Job Orders yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click "Issue Parts to JO" to allocate and deduct inventory parts for maintenance.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Issued Date</TableHead>
            <TableHead className="w-[130px]">JO Number</TableHead>
            <TableHead>Vehicle Info</TableHead>
            <TableHead>Part Code & Name</TableHead>
            <TableHead className="text-right">Qty Issued</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const jo = typeof item.job_order_id === "object" && item.job_order_id !== null ? (item.job_order_id as JobOrderRef) : null;
            const joNo = jo?.jo_no || (typeof item.job_order_id === "number" ? `JO #${item.job_order_id}` : "—");

            const v = jo?.vehicle_id && typeof jo.vehicle_id === "object" ? (jo.vehicle_id as VehicleRef) : null;
            const vehicleText = v?.plate_number || v?.vehicle_name || "—";

            const part = typeof item.part_id === "object" && item.part_id !== null ? (item.part_id as VehiclePart) : null;
            const partCode = part?.part_code || (typeof item.part_id === "number" ? `Part #${item.part_id}` : "—");
            const partName = part?.part_name || "—";
            const unit = part?.unit || "pc";

            const lineTotal = Number(item.quantity_issued || item.quantity_requested || 0) * Number(item.unit_cost || 0);
            const dateStr = item.issued_at ? new Date(item.issued_at).toLocaleDateString() : "—";

            return (
              <TableRow key={item.id}>
                <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                <TableCell className="font-mono text-xs font-semibold">{joNo}</TableCell>
                <TableCell>
                  <span className="text-xs font-medium">{vehicleText}</span>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono font-medium">{partCode}</div>
                  <div className="text-xs text-muted-foreground">{partName}</div>
                </TableCell>
                <TableCell className="text-right font-bold text-sm text-foreground">
                  {item.quantity_issued || item.quantity_requested}{" "}
                  <span className="text-xs text-muted-foreground font-normal">{unit}</span>
                </TableCell>
                <TableCell className="text-right font-medium text-xs">
                  ₱{Number(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold text-xs">
                  ₱{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                  {item.remarks || "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-xs gap-1">
                    <Wrench className="h-3 w-3" />
                    Issued to JO
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
