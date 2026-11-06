"use client";

import * as React from "react";
import type { VehicleJobOrder, UserOption, ApproveAssignPayload } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "./SearchableSelect";
import { CheckCircle2, XCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApproveAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  users: UserOption[];
  onSubmit: (payload: ApproveAssignPayload) => Promise<void>;
  loading: boolean;
}

export function ApproveAssignDialog({
  open,
  onOpenChange,
  jobOrder,
  users,
  onSubmit,
  loading,
}: ApproveAssignDialogProps) {
  const [decision, setDecision] = React.useState<"Approved" | "Rejected">("Approved");
  const [mechanicId, setMechanicId] = React.useState<string>("");
  const [remarks, setRemarks] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setDecision("Approved");
      setMechanicId("");
      setRemarks("");
    }
  }, [open]);

  const userOptions = React.useMemo(() => {
    return users.map((u) => {
      const uId = u.id ?? u.user_id;
      const first = u.first_name || u.user_fname || "";
      const last = u.last_name || u.user_lname || "";
      const name = [first, last].filter(Boolean).join(" ") || `User #${uId}`;
      const pos = u.position || u.user_position || "";
      return {
        value: String(uId),
        label: pos ? `${name} - ${pos}` : name,
      };
    });
  }, [users]);

  if (!jobOrder) return null;

  const vehicle = typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null ? jobOrder.vehicle_id : null;
  const vehiclePlate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null ? (jobOrder.vehicle_id.vehicle_id || jobOrder.vehicle_id.id) : jobOrder.vehicle_id}`;
  const vehicleDetails = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === "Approved" && !mechanicId) return;
    if (decision === "Rejected" && !remarks.trim()) return;

    await onSubmit({
      job_order_id: jobOrder.id,
      decision,
      mechanic_id: decision === "Approved" && mechanicId ? Number(mechanicId) : undefined,
      decision_remarks: remarks,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-primary shrink-0" />
            Review Maintenance Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 w-full min-w-0">
          {/* Summary Details */}
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1.5 border w-full min-w-0">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-xs">JO Number:</span>
              <span className="font-semibold text-xs text-primary">{jobOrder.jo_no}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-xs">Vehicle:</span>
              <span className="font-medium text-xs text-foreground truncate">
                {vehiclePlate} {vehicleDetails ? `(${vehicleDetails})` : ""}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-xs">Type & Priority:</span>
              <span className="text-xs">
                {jobOrder.jo_type} &bull; <strong className="font-semibold">{jobOrder.priority}</strong>
              </span>
            </div>
            {jobOrder.description && (
              <div className="pt-1 border-t text-xs">
                <span className="text-muted-foreground block text-[11px] mb-0.5">Issue Description:</span>
                <p className="text-foreground italic break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  {jobOrder.description}
                </p>
              </div>
            )}
          </div>

          {/* Redesigned Decision UI: Segmented Toggle Cards */}
          <div className="space-y-2 w-full min-w-0">
            <Label className="text-xs font-semibold text-foreground">Decision *</Label>
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Approve Card */}
              <button
                type="button"
                onClick={() => setDecision("Approved")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer",
                  decision === "Approved"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                )}
              >
                <CheckCircle2
                  className={cn(
                    "h-4 w-4 shrink-0",
                    decision === "Approved" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}
                />
                <span>Approve Request</span>
              </button>

              {/* Reject Card */}
              <button
                type="button"
                onClick={() => setDecision("Rejected")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer",
                  decision === "Rejected"
                    ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm ring-1 ring-rose-500/30"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                )}
              >
                <XCircle
                  className={cn(
                    "h-4 w-4 shrink-0",
                    decision === "Rejected" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                  )}
                />
                <span>Reject Request</span>
              </button>
            </div>
          </div>

          {/* Mechanic Assignment - Visible when Approved */}
          {decision === "Approved" && (
            <div className="space-y-1.5 w-full min-w-0">
              <Label htmlFor="mechanic" className="text-xs">
                Assign Mechanic / Personnel <span className="text-destructive font-bold">*</span>
              </Label>
              <SearchableSelect
                options={userOptions}
                value={mechanicId}
                onValueChange={setMechanicId}
                placeholder="Search and assign mechanic..."
              />
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-1.5 w-full min-w-0">
            <Label htmlFor="remarks" className="text-xs">
              Decision Remarks / Instructions {decision === "Rejected" && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Textarea
              id="remarks"
              placeholder={
                decision === "Approved"
                  ? "Notes for mechanic, maintenance bay assignment, etc..."
                  : "State reason for rejecting request..."
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required={decision === "Rejected"}
              className="w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] text-xs resize-y"
            />
          </div>

          <DialogFooter className="pt-3 border-t flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (decision === "Approved" && !mechanicId) || (decision === "Rejected" && !remarks.trim())}
              className={cn(
                "w-full sm:w-auto text-xs font-semibold",
                decision === "Approved"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {loading
                ? "Processing..."
                : decision === "Approved"
                ? "Confirm & Assign"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
