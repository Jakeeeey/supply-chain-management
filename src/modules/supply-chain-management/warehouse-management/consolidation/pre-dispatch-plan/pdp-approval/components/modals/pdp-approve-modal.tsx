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
import { cn } from "@/lib/utils";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { Banknote, FileText, MapPin, Package, User } from "lucide-react";

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
      <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <AlertDialogHeader className="relative px-6 py-8 text-white overflow-hidden">
          {/* Emerald Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800" />
          {/* Subtle Pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-white">
              Approve Dispatch Plan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-emerald-50/90 text-sm max-w-[280px]">
              Please review the trip details below before confirming the
              approval.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="px-6 py-6 space-y-4 bg-background">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {/* PDP Info Card */}
              <div className="rounded-xl border bg-card/50 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        PDP Number
                      </span>
                    </div>
                    <span className="font-bold text-base text-primary">
                      {plan.dispatch_no}
                    </span>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Cluster
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {plan.cluster_name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Assigned Driver
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {plan.driver_name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Shipment Size
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {plan.outlet_count || 0} order(s)
                    </span>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Total Value
                        </span>
                      </div>
                      <span className="font-extrabold text-lg text-emerald-700">
                        {formattedAmount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-muted-foreground font-medium">
                Plan status will move to{" "}
                <span className="text-primary font-bold">Approved</span>.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="px-6 py-4 bg-muted/30 border-t gap-3 sm:gap-0">
          <AlertDialogCancel
            disabled={isLoading}
            className="flex-1 sm:flex-none border-none hover:bg-muted"
          >
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 sm:flex-none min-w-[120px]",
              "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20",
              "transition-all duration-200 active:scale-95",
            )}
          >
            {isLoading ? "Processing..." : "Confirm Approval"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
