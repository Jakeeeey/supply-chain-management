"use client";

import * as React from "react";
import type { PurchaseRequest } from "../types";
import type { VehiclePart } from "../../registration/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Building2, Truck, Calendar, Layers } from "lucide-react";

interface ViewPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequest: PurchaseRequest | null;
  parts?: VehiclePart[];
}

export function ViewPurchaseRequestDialog({
  open,
  onOpenChange,
  purchaseRequest,
  parts = [],
}: ViewPurchaseRequestDialogProps) {
  // Determine line items: Either multi-items or single part fallback
  const lineItems = React.useMemo(() => {
    if (!purchaseRequest) return [];

    if (purchaseRequest.items && purchaseRequest.items.length > 0) {
      return purchaseRequest.items.map((it) => {
        let partObj: VehiclePart | null = null;
        let pId: number = 0;

        if (typeof it.part_id === "object" && it.part_id !== null) {
          partObj = it.part_id as VehiclePart;
          pId = Number(partObj.id);
        } else {
          pId = Number(it.part_id);
          partObj = parts.find((p) => Number(p.id) === pId) || null;
        }

        const partCode = partObj?.part_code || `PRT-${pId}`;
        const partName = partObj?.part_name || `Part #${pId}`;
        const unit = partObj?.unit || "pc";
        const unitCost = Number(it.unit_cost || partObj?.unit_cost || 0);
        const subtotal = Number(it.quantity) * unitCost;

        return {
          id: it.id || pId,
          part_code: partCode,
          part_name: partName,
          unit,
          quantity: it.quantity,
          unit_cost: unitCost,
          subtotal,
          remarks: it.remarks,
        };
      });
    }

    // Fallback single part item
    let singlePartObj: VehiclePart | null = null;
    let singlePId: number = 0;
    if (typeof purchaseRequest.part_id === "object" && purchaseRequest.part_id !== null) {
      singlePartObj = purchaseRequest.part_id as VehiclePart;
      singlePId = Number(singlePartObj.id);
    } else if (purchaseRequest.part_id) {
      singlePId = Number(purchaseRequest.part_id);
      singlePartObj = parts.find((p) => Number(p.id) === singlePId) || null;
    }

    const partCode = singlePartObj?.part_code || (singlePId ? `PRT-${singlePId}` : "—");
    const partName = singlePartObj?.part_name || (singlePId ? `Part #${singlePId}` : "Unspecified Part");
    const unit = singlePartObj?.unit || "pc";
    const unitCost = Number(singlePartObj?.unit_cost || 0);
    const subtotal = Number(purchaseRequest.estimated_cost) || (Number(purchaseRequest.quantity || 1) * unitCost);

    return [
      {
        id: singlePId || 1,
        part_code: partCode,
        part_name: partName,
        unit,
        quantity: purchaseRequest.quantity || 1,
        unit_cost: unitCost,
        subtotal,
        remarks: purchaseRequest.notes || "",
      },
    ];
  }, [purchaseRequest, parts]);

  const totalQuantity = lineItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalCost = Number(purchaseRequest?.estimated_cost) || lineItems.reduce((acc, it) => acc + it.subtotal, 0);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <Badge variant="destructive" className="text-[11px] px-2 py-0">Critical Stockout</Badge>;
      case "Urgent":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2 py-0">Urgent</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px] px-2 py-0">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Received":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">Received</Badge>;
      case "Approved":
      case "Ordered":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[11px]">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive" className="text-[11px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">{status}</Badge>;
    }
  };

  if (!purchaseRequest) return null;

  // Resolve Branch Name
  const branchName =
    typeof purchaseRequest.branch_id === "object" && purchaseRequest.branch_id !== null
      ? (purchaseRequest.branch_id as { branch_name?: string }).branch_name
      : `Branch #${purchaseRequest.branch_id}`;

  // Resolve Supplier Name
  const supplierName =
    purchaseRequest.supplier_name ||
    (typeof purchaseRequest.supplier_id === "object" && purchaseRequest.supplier_id !== null
      ? (purchaseRequest.supplier_id as { supplier_name?: string }).supplier_name
      : purchaseRequest.supplier_id
      ? `Supplier #${purchaseRequest.supplier_id}`
      : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Purchase Order #{purchaseRequest.pr_no}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              {getPriorityBadge(purchaseRequest.priority)}
              {getStatusBadge(purchaseRequest.status)}
            </div>
          </div>
          <DialogDescription className="text-xs">
            Review detailed specifications, items list, and financial summary for this purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* Header Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Target Branch:
              </span>
              <p className="font-semibold text-foreground">{branchName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                Supplier:
              </span>
              <p className="font-semibold text-foreground">{supplierName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Delivery Date:
              </span>
              <p className="font-medium text-foreground">
                {purchaseRequest.expected_delivery_date
                  ? new Date(purchaseRequest.expected_delivery_date).toLocaleDateString()
                  : "Not specified"}
              </p>
            </div>
          </div>

          {/* Notes Banner if available */}
          {purchaseRequest.notes && (
            <div className="rounded-md bg-muted/20 border p-2.5 text-xs">
              <span className="font-semibold text-muted-foreground block mb-0.5">Justification / Notes:</span>
              <p className="text-foreground whitespace-pre-wrap">{purchaseRequest.notes}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Purchase Items ({lineItems.length})
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Total Qty: <strong className="text-foreground">{totalQuantity}</strong> | Total Est. Cost:{" "}
                <strong className="text-primary font-mono">
                  ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px]">
                    <TableHead className="w-[120px]">Part Code</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead className="text-center w-[90px]">Qty</TableHead>
                    <TableHead className="text-right w-[110px]">Unit Cost</TableHead>
                    <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="font-mono text-primary font-medium">
                        {item.part_code}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{item.part_name}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{item.quantity}</span>{" "}
                        <span className="text-muted-foreground text-[10px]">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ₱{item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        ₱{item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
