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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "./SearchableSelect";
import { CheckCircle2, XCircle } from "lucide-react";

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
      return {
        value: String(uId),
        label: name,
      };
    });
  }, [users]);

  if (!jobOrder) return null;

  const vehicle = typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null ? jobOrder.vehicle_id : null;
  const vehiclePlate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null ? (jobOrder.vehicle_id.vehicle_id || jobOrder.vehicle_id.id) : jobOrder.vehicle_id}`;
  const vehicleDetails = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve / Assign Mechanic</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">JO Number:</span>
              <span className="font-semibold">{jobOrder.jo_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="font-medium">
                {vehiclePlate} {vehicleDetails ? `(${vehicleDetails})` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{jobOrder.jo_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <span className="font-medium">{jobOrder.priority}</span>
            </div>
          </div>

          {/* Decision */}
          <div className="space-y-2">
            <Label>Decision</Label>
            <RadioGroup
              value={decision}
              onValueChange={(val: "Approved" | "Rejected") => setDecision(val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Approved" id="approve" />
                <Label htmlFor="approve" className="text-emerald-600 font-semibold cursor-pointer flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Rejected" id="reject" />
                <Label htmlFor="reject" className="text-rose-600 font-semibold cursor-pointer flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Reject
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mechanic Assignment */}
          {decision === "Approved" && (
            <div className="space-y-1.5">
              <Label htmlFor="mechanic">
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
          <div className="space-y-1.5">
            <Label htmlFor="remarks">
              Decision Remarks / Instructions {decision === "Rejected" && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Textarea
              id="remarks"
              placeholder={
                decision === "Approved"
                  ? "Notes for mechanic, maintenance bay assignment, etc..."
                  : "Reason for rejecting request..."
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required={decision === "Rejected"}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (decision === "Approved" && !mechanicId)}
              className={decision === "Approved" ? "bg-primary" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {loading ? "Processing..." : decision === "Approved" ? "Confirm & Assign" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
