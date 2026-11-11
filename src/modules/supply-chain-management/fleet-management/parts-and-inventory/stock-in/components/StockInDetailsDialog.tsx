"use client";

import * as React from "react";
import type { StockInTransactionHeader } from "../types";
import type { VehiclePart } from "../../registration/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, FileText, Package, ArrowDownLeft } from "lucide-react";

interface StockInDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: StockInTransactionHeader | null;
}

export function StockInDetailsDialog({
  open,
  onOpenChange,
  transaction,
}: StockInDetailsDialogProps) {
  if (!transaction) return null;

  const dateStr = transaction.created_at
    ? new Date(transaction.created_at).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              <span>Stock In Details:</span>
              <span className="font-mono text-primary font-bold">
                {transaction.reference_no}
              </span>
            </DialogTitle>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 gap-1">
              <ArrowDownLeft className="h-3 w-3" />
              Stock In
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Review breakdown of spare parts received in this shipment batch.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date & Time
            </div>
            <div className="font-medium mt-0.5">{dateStr}</div>
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Branch
            </div>
            <div className="font-medium mt-0.5">{transaction.branch_name}</div>
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Total Received
            </div>
            <div className="font-bold text-emerald-600 mt-0.5">
              +{transaction.total_quantity} units ({transaction.total_items} {transaction.total_items === 1 ? "item" : "items"})
            </div>
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              ₱ Total Cost
            </div>
            <div className="font-bold text-foreground mt-0.5">
              ₱{transaction.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {transaction.remarks && (
          <div className="text-xs px-3 py-2 bg-background border rounded text-muted-foreground flex items-start gap-1.5">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Transaction Remarks: </span>
              {transaction.remarks}
            </div>
          </div>
        )}

        {/* Details Table */}
        <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[120px]">Part Code</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Item Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map((item, idx) => {
                const part =
                  typeof item.part_id === "object" && item.part_id !== null
                    ? (item.part_id as VehiclePart)
                    : null;
                const partCode =
                  part?.part_code ||
                  (typeof item.part_id === "number" ? `Part #${item.part_id}` : "—");
                const partName = part?.part_name || "—";
                const unit = part?.unit || "pc";
                const rowTotal = Number(item.quantity || 0) * Number(item.unit_cost || 0);

                return (
                  <TableRow key={item.id || idx}>
                    <TableCell className="font-mono font-medium text-xs">
                      {partCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{partName}</div>
                      {part?.category && (
                        <div className="text-[11px] text-muted-foreground">
                          {part.category}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs text-emerald-600">
                      +{item.quantity} <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      ₱{Number(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs">
                      ₱{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.remarks || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

