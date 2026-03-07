"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";

interface PDPApproveModalProps {
  open: boolean;
  onClose: () => void;
  plan: DispatchPlan | null;
  onConfirm: () => void;
  isLoading: boolean;
}

/**
 * Confirmation dialog for approving a dispatch plan.
 * Shows plan summary before approval action.
 */
export function PDPApproveModal({
  open,
  onClose,
  plan,
  onConfirm,
  isLoading,
}: PDPApproveModalProps) {
  if (!plan) return null;

  const formattedAmount = plan.total_amount
    ? `₱${Number(plan.total_amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
      })}`
    : "₱0.00";

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Dispatch Plan</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to approve the following dispatch plan?
              </p>
              <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PDP No.</span>
                  <span className="font-semibold">{plan.dispatch_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cluster</span>
                  <span>{plan.cluster_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span>{plan.driver_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders</span>
                  <span>{plan.outlet_count || 0} order(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formattedAmount}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This action will change the plan status from Pending to
                Approved.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? "Approving..." : "Approve"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
