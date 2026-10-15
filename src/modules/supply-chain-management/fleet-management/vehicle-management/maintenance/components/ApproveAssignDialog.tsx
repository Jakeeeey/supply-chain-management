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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || `User #${u.id}`;
      return {
        value: String(u.id),
        label: `${name}${u.email ? ` (${u.email})` : ""}`,
      };
    });
  }, [users]);

  if (!jobOrder) return null;

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
                <RadioGroupItem value="Approved" id="dec-app" />
                <Label htmlFor="dec-app" className="cursor-pointer text-emerald-600 font-medium">
                  Approve
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Rejected" id="dec-rej" />
                <Label htmlFor="dec-rej" className="cursor-pointer text-destructive font-medium">
                  Reject
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Assign Mechanic (required if approved) */}
          {decision === "Approved" && (
            <div className="space-y-1.5">
              <Label htmlFor="mechanic">Assign Mechanic / Personnel *</Label>
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
            <Label htmlFor="remarks">Decision Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Notes or instructions for the mechanic..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (decision === "Approved" && !mechanicId)}
              variant={decision === "Approved" ? "default" : "destructive"}
            >
              {loading ? "Processing..." : decision === "Approved" ? "Confirm & Assign" : "Reject JO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
