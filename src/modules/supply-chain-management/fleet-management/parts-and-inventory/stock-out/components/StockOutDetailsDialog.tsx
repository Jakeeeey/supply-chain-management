"use client";

import * as React from "react";
import type { OutboundMovement } from "../types";
import type { VehiclePart } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  Building2,
  Calendar,
  FileText,
  Layers,
  User,
  Wrench,
  Truck,
} from "lucide-react";

interface StockOutDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: OutboundMovement | null;
}

export function StockOutDetailsDialog({
  open,
  onOpenChange,
  movement,
}: StockOutDetailsDialogProps) {
  if (!movement) return null;

  const part =
    typeof movement.part_id === "object" && movement.part_id !== null
      ? (movement.part_id as VehiclePart)
      : null;
  const partCode = part?.part_code || (typeof movement.part_id === "number" ? `Part #${movement.part_id}` : "—");
  const partName = part?.part_name || "—";
  const unit = part?.unit || "pc";

  const branch =
    typeof movement.branch_id === "object" && movement.branch_id !== null
      ? (movement.branch_id as Branch)
      : null;
  const branchName = branch?.branch_name || (typeof movement.branch_id === "number" ? `Branch #${movement.branch_id}` : "Main Branch");

  const qty = Number(movement.quantity) || 0;
  const cost = Number(movement.unit_cost) || 0;
  const total = qty * cost;
  const dateStr = movement.created_at ? new Date(movement.created_at).toLocaleString() : "—";

  // Jo & Vehicle
  let joText = "—";
  if (movement.job_order_id) {
    if (typeof movement.job_order_id === "object") {
      joText = movement.job_order_id.jo_no || `JO #${movement.job_order_id.id}`;
    } else {
      joText = `JO #${movement.job_order_id}`;
    }
  }

  let vehicleText = "—";
  if (movement.vehicle_id) {
    if (typeof movement.vehicle_id === "object") {
      vehicleText = movement.vehicle_id.plate_number || movement.vehicle_id.vehicle_name || `Vehicle #${movement.vehicle_id.id}`;
    } else {
      vehicleText = `Vehicle #${movement.vehicle_id}`;
    }
  }

  // User / Audit
  let createdByText = "System User";
  if (movement.created_by) {
    if (typeof movement.created_by === "object") {
      const name = [movement.created_by.first_name, movement.created_by.last_name].filter(Boolean).join(" ");
      createdByText = name || movement.created_by.email || `User #${movement.created_by.id}`;
    } else {
      createdByText = `User #${movement.created_by}`;
    }
  }

  // Badge class
  let badgeClass = "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400";
  if (movement.movement_type === "Scrap" || movement.movement_type === "Disposal") {
    badgeClass = "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400";
  } else if (movement.movement_type === "Damage") {
    badgeClass = "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400";
  } else if (movement.movement_type === "Adjustment") {
    badgeClass = "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-rose-600" />
              <span>Stock Out Transaction:</span>
              <span className="font-mono text-primary font-bold">
                {movement.reference_no || `SO-${movement.id}`}
              </span>
            </DialogTitle>
            <Badge variant="outline" className={`text-xs ${badgeClass}`}>
              {movement.movement_type}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Review detailed inventory deduction breakdown, destination, and creator audit trail.
          </DialogDescription>
        </DialogHeader>

        {/* Part Details Box */}
        <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-foreground">{partCode}</div>
              <div className="text-sm font-semibold text-foreground">{partName}</div>
              {part?.category && (
                <Badge variant="secondary" className="text-[10px] mt-1 font-normal">
                  {part.category}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-destructive">
                -{qty} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {unit}
              </div>
              <div className="text-xs font-semibold text-foreground mt-1">
                Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs border rounded-lg p-3 bg-card">
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
            <div className="font-medium mt-0.5">{branchName}</div>
          </div>

          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" /> Job Order
            </div>
            <div className="font-medium mt-0.5">{joText}</div>
          </div>

          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Target Vehicle
            </div>
            <div className="font-medium mt-0.5">{vehicleText}</div>
          </div>

          <div className="col-span-2 pt-2 border-t">
            <div className="text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-primary" /> Recorded By (Audit)
            </div>
            <div className="font-medium mt-0.5 text-foreground">{createdByText}</div>
          </div>
        </div>

        {/* Remarks Section */}
        {movement.remarks && (
          <div className="text-xs px-3 py-2 bg-muted/20 border rounded text-muted-foreground flex items-start gap-1.5">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Remarks / Reason: </span>
              {movement.remarks}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

