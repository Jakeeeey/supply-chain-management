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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { Calendar, MapPin, Package, Truck } from "lucide-react";

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
      <AlertDialogContent className="sm:max-w-md bg-background p-0 overflow-hidden border">
        <AlertDialogHeader className="px-6 pt-6 text-left">
          <AlertDialogTitle className="text-xl font-bold">
            {plan.dispatch_no}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm">
            Please review the trip summary before confirming the approval.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div className="rounded-lg border bg-muted/5 p-4 space-y-4">
            {/* Trip Information Cards - Horizontal Scrollable */}
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex gap-3 min-w-max">
                {/* Date Card */}
                <div className="bg-background border rounded-lg p-3 w-[160px] shrink-0">
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
                <div className="bg-background border rounded-lg p-3 w-[160px] shrink-0">
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
                <div className="bg-background border rounded-lg p-3 w-[160px] shrink-0">
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
                <div className="bg-background border rounded-lg p-3 w-[120px] shrink-0">
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
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Value
              </span>
              <span className="text-lg font-bold tracking-tight text-primary">
                {formattedAmount}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            This action will mark the plan as{" "}
            <span className="font-semibold text-primary">Approved</span>.
          </p>
        </div>

        <AlertDialogFooter className="px-6 py-4 bg-muted/10 border-t">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="font-semibold"
          >
            {isLoading ? "Approving..." : "Confirm Approval"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
