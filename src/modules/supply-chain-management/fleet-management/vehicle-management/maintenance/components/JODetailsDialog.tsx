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
import { Separator } from "@/components/ui/separator";
import { Wrench, Calendar, Gauge, User, DollarSign, Package } from "lucide-react";

interface JODetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
}

export function JODetailsDialog({
  open,
  onOpenChange,
  jobOrder,
}: JODetailsDialogProps) {
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
              <span className="font-semibold">{vehicle?.vehicle_plate || vehicle?.plate_number || "N/A"}</span>
              <span className="text-xs text-muted-foreground block">
                {([vehicle?.make, vehicle?.model].filter(Boolean).join(" ")) || vehicle?.name || ""}
              </span>
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
              <span className="text-xs text-muted-foreground block">Odometer</span>
              <span className="font-semibold flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                {jobOrder.odometer_reading ? `${jobOrder.odometer_reading} km` : (vehicle?.current_mileage ? `${vehicle.current_mileage} km` : "N/A")}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-1">
              Issue / Maintenance Details
            </span>
            <p className="bg-card border p-3 rounded-md text-foreground leading-relaxed">
              {jobOrder.description}
            </p>
          </div>

          <Separator />

          {/* Assignments & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block">
                Personnel & Assignment
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Mechanic:</span>
                  <span className="font-medium text-foreground">
                    {mechanic ? `${mechanic.first_name || ""} ${mechanic.last_name || ""}` : "Not assigned"}
                  </span>
                </div>
                {requestedBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested By:</span>
                    <span>{requestedBy.first_name} {requestedBy.last_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block">
                Timeline
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Requested:</span>
                  <span>{jobOrder.requested_at ? new Date(jobOrder.requested_at).toLocaleString() : "N/A"}</span>
                </div>
                {jobOrder.started_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <span>{new Date(jobOrder.started_at).toLocaleString()}</span>
                  </div>
                )}
                {jobOrder.completed_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{new Date(jobOrder.completed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parts Section */}
          <Separator />
          <div>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Package className="h-4 w-4 text-primary" />
              Parts Requested & Issued
            </span>
            {jobOrder.parts && jobOrder.parts.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2 text-left font-medium">Part Code / Name</th>
                      <th className="p-2 text-center font-medium">Requested</th>
                      <th className="p-2 text-center font-medium">Issued</th>
                      <th className="p-2 text-right font-medium">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobOrder.parts.map((p, idx) => (
                      <tr key={idx} className="border-b last:border-none">
                        <td className="p-2 font-medium">
                          {p.part_name || `Part #${p.part_id}`}
                          {p.part_code && <span className="text-muted-foreground ml-1">({p.part_code})</span>}
                        </td>
                        <td className="p-2 text-center">{p.quantity_requested}</td>
                        <td className="p-2 text-center font-semibold text-emerald-600">
                          {p.quantity_issued || 0}
                        </td>
                        <td className="p-2 text-right">₱{(p.unit_cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No parts registered for this Job Order.</p>
            )}
          </div>

          {/* Completion summary if completed */}
          {jobOrder.status === "Completed" && (
            <>
              <Separator />
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md space-y-1 text-xs text-emerald-950">
                <div className="font-semibold flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                  Service Completion & Cost Summary
                </div>
                <div className="flex justify-between pt-1">
                  <span>Labor Cost:</span>
                  <span className="font-bold">₱{(jobOrder.labor_cost || 0).toLocaleString()}</span>
                </div>
                {jobOrder.completion_remarks && (
                  <div className="pt-1">
                    <span className="font-medium">Remarks:</span> {jobOrder.completion_remarks}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
