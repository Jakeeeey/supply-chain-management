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
import { Calendar, MapPin, MessageSquare, Package, Truck } from "lucide-react";

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

  const totalAmount = plan.total_amount
    ? parseFloat(plan.total_amount.toString())
    : 0;
  const formattedAmount = `₱${totalAmount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;

  const formattedDate = plan.dispatch_date
    ? new Date(plan.dispatch_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="sm:max-w-lg bg-background p-0 overflow-hidden border shadow-lg">
        <AlertDialogHeader className="px-6 pt-6 text-left border-b pb-4">
          <div className="space-y-1">
            <AlertDialogTitle className="text-xl font-bold tracking-tight">
              {plan.dispatch_no}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs font-medium">
              Please review the trip summary before confirming the approval.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="p-6 space-y-5">
          {/* Summary Grid - 2 Column for neatness in smaller dialog */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Card */}
            <div className="bg-muted/5 border rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Date
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">
                {formattedDate}
              </p>
            </div>

            {/* Cluster Card */}
            <div className="bg-muted/5 border rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Cluster
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-foreground truncate">
                  {plan.cluster_name || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground font-medium truncate">
                  {plan.branch_name}
                </p>
              </div>
            </div>

            {/* Driver Card */}
            <div className="bg-muted/5 border rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Truck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Driver
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-foreground truncate">
                  {plan.driver_name || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground font-medium truncate">
                  {plan.vehicle_type_name}
                </p>
              </div>
            </div>

            {/* Orders Card */}
            <div className="bg-muted/5 border rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Package className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Orders
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-foreground">
                  {plan.outlet_count || 0} order(s)
                </p>
                <p className="text-[9px] text-muted-foreground font-medium">
                  {(plan.total_weight || 0).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  kg
                </p>
              </div>
            </div>
          </div>

          {plan.remarks && (
            <div className="bg-muted/50 border rounded-lg p-3.5 flex gap-3">
              <div className="shrink-0 pt-0.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Remarks
                </span>
                <p className="text-xs leading-relaxed text-foreground">
                  {plan.remarks}
                </p>
              </div>
            </div>
          )}

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Trip Value
            </span>
            <span className="text-xl font-bold tracking-tight text-primary">
              {formattedAmount}
            </span>
          </div>

          <div className="bg-muted/30 rounded-lg px-3 py-2 border border-dashed flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] text-muted-foreground">
              This action will mark the plan as{" "}
              <span className="font-semibold text-primary">Approved</span>.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="px-6 py-4 bg-muted/10 border-t flex items-center justify-end gap-3">
          <AlertDialogCancel
            disabled={isLoading}
            className="h-9 px-4 text-xs font-medium"
            onClick={onClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Approving..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
