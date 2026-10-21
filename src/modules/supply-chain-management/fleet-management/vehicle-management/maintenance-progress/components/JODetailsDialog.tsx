"use client";

import * as React from "react";
import type { VehicleJobOrder } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wrench, Package, Calendar, User, UserCheck } from "lucide-react";

interface JODetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
}

export function JODetailsDialog({ open, onOpenChange, jobOrder }: JODetailsDialogProps) {
  if (!jobOrder) return null;

  const vehicle =
    typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null
      ? jobOrder.vehicle_id
      : null;
  const mechanic =
    typeof jobOrder.mechanic_id === "object" && jobOrder.mechanic_id !== null
      ? jobOrder.mechanic_id
      : null;
  const requestedBy =
    typeof jobOrder.requested_by === "object" && jobOrder.requested_by !== null
      ? jobOrder.requested_by
      : null;

  const plate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null ? (jobOrder.vehicle_id.vehicle_id || jobOrder.vehicle_id.id) : jobOrder.vehicle_id}`;
  const details = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-primary" />
              Job Order #{jobOrder.jo_no}
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {jobOrder.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-sm">
          {/* Key Info Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg">
            <div>
              <span className="text-xs text-muted-foreground block">Vehicle</span>
              <span className="font-semibold">{plate}</span>
              {details && <span className="text-xs text-muted-foreground block">{details}</span>}
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Type</span>
              <span className="font-semibold">{jobOrder.jo_type}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Priority</span>
              <span className="font-semibold">{jobOrder.priority}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Assigned Mechanic</span>
              <span className="font-semibold flex items-center gap-1 text-emerald-600">
                <UserCheck className="h-3.5 w-3.5" />
                {(() => {
                  if (!mechanic) {
                    return jobOrder.mechanic_id ? `Mechanic #${jobOrder.mechanic_id}` : "Unassigned";
                  }
                  const first = mechanic.first_name || mechanic.user_fname || "";
                  const last = mechanic.last_name || mechanic.user_lname || "";
                  const full = [first, last].filter(Boolean).join(" ");
                  return full || mechanic.email || mechanic.user_email || `Mechanic #${mechanic.id || mechanic.user_id}`;
                })()}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-1">
              Issue / Maintenance Description:
            </span>
            <div className="p-3 bg-muted/20 border rounded-md text-xs whitespace-pre-wrap">
              {jobOrder.description}
            </div>
          </div>

          {/* Decision Remarks */}
          {jobOrder.decision_remarks && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                Approval Remarks / Instructions:
              </span>
              <div className="p-3 bg-blue-50/50 border border-blue-200 dark:border-blue-900 rounded-md text-xs whitespace-pre-wrap">
                {jobOrder.decision_remarks}
              </div>
            </div>
          )}

          {/* Requested/Issued Parts Section */}
          {jobOrder.parts && jobOrder.parts.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                <Package className="h-4 w-4" /> Parts ({jobOrder.parts.length})
              </span>
              <div className="border rounded-md divide-y text-xs">
                {jobOrder.parts.map((p, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">{p.part_name || p.part_code || `Part #${p.part_id}`}</span>
                      {p.part_code && <span className="text-muted-foreground ml-2 font-mono">({p.part_code})</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Req: <strong>{p.quantity_requested}</strong></span>
                      <span className="text-emerald-600">Issued: <strong>{p.quantity_issued || 0}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requester & Audit */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t pt-3">
            <div>
              <span className="text-muted-foreground flex items-center gap-1 mb-0.5">
                <User className="h-3.5 w-3.5" /> Requested By
              </span>
              <span>{requestedBy ? `${requestedBy.first_name || ""} ${requestedBy.last_name || ""}` : "System User"}</span>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1 mb-0.5">
                <Calendar className="h-3.5 w-3.5" /> Started At
              </span>
              <span>{jobOrder.started_at ? new Date(jobOrder.started_at).toLocaleString() : "N/A"}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
