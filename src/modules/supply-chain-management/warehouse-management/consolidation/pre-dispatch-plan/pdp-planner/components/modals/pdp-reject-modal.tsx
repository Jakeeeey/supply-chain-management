"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface PDPRejectModalProps {
  open: boolean;
  onClose: () => void;
  plan: DispatchPlan | null;
  onConfirm: (remarks: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Modal for rejecting a dispatch plan with mandatory remarks.
 */
export function PDPRejectModal({
  open,
  onClose,
  plan,
  onConfirm,
  isLoading,
}: PDPRejectModalProps) {
  const [remarks, setRemarks] = useState("");

  const handleConfirm = async () => {
    if (!remarks.trim()) return;
    await onConfirm(remarks);
    setRemarks("");
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <DialogTitle>Reject Dispatch Plan</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to reject <strong>{plan.dispatch_no}</strong>? 
            This will release all attached Sales Orders and send the plan back to creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Rejection Remarks <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-[100px] resize-none break-all"
            />
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 flex gap-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive font-medium leading-relaxed">
              This action is final for the current version of the plan. The orders will need to be re-processed in a new or updated plan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !remarks.trim()}
          >
            {isLoading ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
