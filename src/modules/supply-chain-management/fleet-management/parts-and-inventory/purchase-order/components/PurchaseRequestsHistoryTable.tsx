"use client";

import * as React from "react";
import type { PurchaseRequest } from "../types";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, CheckCircle2, PackagePlus, XCircle } from "lucide-react";

interface PurchaseRequestsHistoryTableProps {
  items: PurchaseRequest[];
  parts?: VehiclePart[];
  loading: boolean;
  actionLoading?: boolean;
  onStatusUpdate?: (id: number, action: "approve" | "receive" | "cancel") => Promise<boolean>;
}

export function PurchaseRequestsHistoryTable({
  items,
  parts = [],
  loading,
  actionLoading,
  onStatusUpdate,
}: PurchaseRequestsHistoryTableProps) {
  if (loading && items.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-sm font-semibold">No purchase requests submitted yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Click &quot;Create Purchase Request&quot; or &quot;Reorder&quot; from the low stock trigger list to create a replenishment order.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">PR Number</TableHead>
            <TableHead>Part Code & Name</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Qty Requested</TableHead>
            <TableHead className="text-right">Estimated Cost</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const rawPartId = typeof item.part_id === "object" && item.part_id !== null ? Number(item.part_id.id) : Number(item.part_id);
            const foundCatalogPart = parts.find((p) => Number(p.id) === rawPartId);
            const part =
              (typeof item.part_id === "object" && item.part_id !== null
                ? (item.part_id as VehiclePart)
                : null) || foundCatalogPart;
            const partCode = part?.part_code || (rawPartId ? `Part #${rawPartId}` : "—");
            const partName = part?.part_name || "—";
            const unit = part?.unit || "pc";

            const branch =
              typeof item.branch_id === "object" && item.branch_id !== null
                ? (item.branch_id as Branch)
                : null;
            const branchName = branch?.branch_name || (typeof item.branch_id === "number" ? `Branch #${item.branch_id}` : "—");

            let priorityBadge = "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400";
            if (item.priority === "Critical") {
              priorityBadge = "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400 font-bold";
            } else if (item.priority === "Urgent") {
              priorityBadge = "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 font-semibold";
            }

            let statusBadge = "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400";
            if (item.status === "Approved" || item.status === "Ordered") {
              statusBadge = "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400";
            } else if (item.status === "Received") {
              statusBadge = "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 font-semibold";
            } else if (item.status === "Cancelled") {
              statusBadge = "bg-zinc-500/10 text-zinc-700 border-zinc-200 dark:text-zinc-400";
            }

            return (
              <TableRow key={item.id || item.pr_no}>
                <TableCell className="font-mono text-xs font-semibold">{item.pr_no}</TableCell>
                <TableCell>
                  <div className="text-xs font-mono font-medium">{partCode}</div>
                  <div className="text-xs text-muted-foreground">{partName}</div>
                </TableCell>
                <TableCell className="text-xs">{branchName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${priorityBadge}`}>
                    {item.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-xs">
                  {item.quantity} <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  ₱{Number(item.estimated_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.supplier_name || "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-[11px] ${statusBadge}`}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                  {item.notes || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {item.status === "Pending" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onStatusUpdate?.(item.id, "approve")}
                            className="text-blue-600 focus:text-blue-600 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve PO
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusUpdate?.(item.id, "cancel")}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Request
                          </DropdownMenuItem>
                        </>
                      )}

                      {(item.status === "Approved" || item.status === "Ordered") && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onStatusUpdate?.(item.id, "receive")}
                            className="text-emerald-600 focus:text-emerald-600 cursor-pointer font-medium"
                          >
                            <PackagePlus className="h-4 w-4 mr-2" />
                            Receive Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusUpdate?.(item.id, "cancel")}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel PO
                          </DropdownMenuItem>
                        </>
                      )}

                      {item.status === "Received" && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                          Already received & stocked in
                        </div>
                      )}

                      {item.status === "Cancelled" && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                          Request cancelled
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
