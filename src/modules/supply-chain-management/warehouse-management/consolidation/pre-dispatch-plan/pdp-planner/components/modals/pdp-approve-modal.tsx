"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import {
  formatNumber,
  formatPeso,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Package,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PDPApproveModalProps {
  open: boolean;
  onClose: () => void;
  plan: DispatchPlan | null;
  onConfirm: () => void;
  isLoading: boolean;
  fetchDetails: (id: number | string) => Promise<{
    plan: DispatchPlan;
    details: DispatchPlanDetail[];
  }>;
}

/**
 * Full-detail confirmation dialog for approving a dispatch plan.
 * Shows trip summary + complete sales order manifest before approval.
 */
export function PDPApproveModal({
  open,
  onClose,
  plan,
  onConfirm,
  isLoading,
  fetchDetails,
}: PDPApproveModalProps) {
  const [details, setDetails] = useState<DispatchPlanDetail[]>([]);
  const [enrichedPlan, setEnrichedPlan] = useState<DispatchPlan | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (open && plan) {
      queueMicrotask(() => setIsFetching(true));
      fetchDetails(plan.dispatch_id)
        .then((result) => {
          setEnrichedPlan(result.plan);
          setDetails(result.details);
        })
        .catch(console.error)
        .finally(() => {
          setIsFetching(false);
        });
    } else {
      queueMicrotask(() => {
        setDetails([]);
        setEnrichedPlan(null);
      });
    }
  }, [open, plan, fetchDetails]);

  if (!plan) return null;

  const displayPlan = enrichedPlan || plan;

  const totalAmount = details.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0);

  const formattedDate = displayPlan.dispatch_date
    ? new Date(displayPlan.dispatch_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {displayPlan.dispatch_no}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Please review the full trip details before confirming the
                approval.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-5 space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date */}
              <div className="bg-muted/5 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Date
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {formattedDate}
                </p>
              </div>

              {/* Cluster */}
              <div className="bg-muted/5 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Cluster
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">
                  {displayPlan.cluster_name || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground font-medium truncate">
                  {displayPlan.branch_name}
                </p>
              </div>

              {/* Driver */}
              <div className="bg-muted/5 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Driver
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">
                  {displayPlan.driver_name || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground font-medium truncate">
                  {displayPlan.vehicle_plate
                    ? `${displayPlan.vehicle_plate}${displayPlan.vehicle_type_name ? ` (${displayPlan.vehicle_type_name})` : ""}`
                    : displayPlan.vehicle_type_name || "—"}
                </p>
              </div>

              {/* Orders */}
              <div className="bg-muted/5 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Orders
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {details.length || displayPlan.outlet_count || 0} order(s)
                </p>
                <p className="text-[9px] text-muted-foreground font-medium">
                  {formatNumber(totalWeight || displayPlan.total_weight || 0)}{" "}
                  kg
                </p>
              </div>
            </div>

            {/* Remarks */}
            {displayPlan.remarks && (
              <div className="bg-muted/50 border rounded-lg p-3.5 flex gap-3">
                <div className="shrink-0 pt-0.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Remarks
                  </span>
                  <p className="text-xs leading-relaxed text-foreground">
                    {displayPlan.remarks}
                  </p>
                </div>
              </div>
            )}

            {/* Manifest Table */}
            <div className="bg-background border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between shrink-0">
                <h4 className="text-xs font-semibold">
                  Detailed Trip Manifest
                </h4>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {details.length} orders
                </div>
              </div>

              {isFetching ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="relative max-h-[300px] min-h-[100px] overflow-auto border-t">
                  <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 bg-background">
                      <tr>
                        <th className="h-9 px-2 text-center align-middle font-bold text-[10px] uppercase tracking-wider w-10 text-foreground border-b">
                          #
                        </th>
                        <th className="h-9 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          SO Number
                        </th>
                        <th className="h-9 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Customer / Outlet
                        </th>
                        <th className="h-9 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Destination
                        </th>
                        <th className="h-9 px-2 text-right align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Weight (kg)
                        </th>
                        <th className="h-9 px-2 text-right align-middle font-bold text-[10px] uppercase tracking-wider text-foreground pr-4 border-b">
                          Amount (₱)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-medium">
                      {details.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-10 text-muted-foreground italic text-xs"
                          >
                            No sales orders attached to this plan.
                          </td>
                        </tr>
                      ) : (
                        details.map((detail, index) => (
                          <tr
                            key={detail.detail_id || index}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-2 align-middle text-center text-xs text-muted-foreground w-10 border-b">
                              {index + 1}
                            </td>
                            <td className="p-2 align-middle text-xs font-semibold text-primary border-b">
                              {detail.order_no || "—"}
                            </td>
                            <td className="p-2 align-middle text-xs border-b">
                              {detail.customer_name || "—"}
                            </td>
                            <td className="p-2 align-middle text-[11px] text-muted-foreground border-b">
                              {[detail.brgy, detail.city, detail.province]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </td>
                            <td className="p-2 align-middle text-right text-xs tabular-nums border-b">
                              {formatNumber(detail.weight || 0)}
                            </td>
                            <td className="p-2 align-middle text-right text-xs font-semibold tabular-nums pr-4 border-b">
                              {formatPeso(detail.amount || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Trip Value */}
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Trip Value
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {formatNumber(totalWeight || displayPlan.total_weight || 0)}{" "}
                  kg total weight
                </p>
              </div>
              <span className="text-2xl font-bold tracking-tight text-primary">
                {formatPeso(
                  totalAmount ||
                    (displayPlan.total_amount
                      ? parseFloat(displayPlan.total_amount.toString())
                      : 0),
                )}
              </span>
            </div>

            {/* Warning notice */}
            <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-dashed flex items-center gap-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                This action will mark the plan as{" "}
                <span className="font-semibold text-primary">Approved</span> and
                cannot be undone.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/10 border-t flex items-center justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            disabled={isLoading}
            className="h-9 px-4 text-xs font-medium"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="h-9 px-4 text-xs font-semibold"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {isLoading ? "Approving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
