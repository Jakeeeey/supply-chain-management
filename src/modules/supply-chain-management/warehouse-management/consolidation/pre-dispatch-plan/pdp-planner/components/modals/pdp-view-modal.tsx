"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import {
  formatNumber,
  formatPeso,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";
import { Calendar, MapPin, MessageSquare, Package, Truck } from "lucide-react";
import { useEffect, useState } from "react";

interface PDPViewModalProps {
  open: boolean;
  onClose: () => void;
  plan: DispatchPlan | null;
  fetchDetails: (id: number | string) => Promise<{
    plan: DispatchPlan;
    details: DispatchPlanDetail[];
  }>;
}

/**
 * Read-only view modal for dispatch plan details.
 * Shows trip configuration and detailed manifest.
 */
export function PDPViewModal({
  open,
  onClose,
  plan,
  fetchDetails,
}: PDPViewModalProps) {
  const [details, setDetails] = useState<DispatchPlanDetail[]>([]);
  const [enrichedPlan, setEnrichedPlan] = useState<DispatchPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && plan) {
      queueMicrotask(() => setIsLoading(true));
      fetchDetails(plan.dispatch_id)
        .then((result) => {
          setEnrichedPlan(result.plan);
          setDetails(result.details);
        })
        .catch(console.error)
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      queueMicrotask(() => {
        setDetails([]);
        setEnrichedPlan(null);
      });
    }
  }, [open, plan, fetchDetails]);

  const displayPlan = enrichedPlan || plan;
  if (!displayPlan) return null;

  const totalAmount = details.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0);

  const formattedDate = displayPlan.dispatch_date
    ? new Date(displayPlan.dispatch_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-semibold">
                  {displayPlan.dispatch_no}
                </DialogTitle>
                <Badge
                  variant={
                    displayPlan.status === "Approved" ? "default" : "secondary"
                  }
                  className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                >
                  {displayPlan.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Dispatch Plan Details
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/5">
          <div className="px-6 space-y-6">
            {/* Trip Information Cards - Responsive Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Dispatch Date
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {formattedDate}
                </p>
              </div>

              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Cluster
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayPlan.cluster_name || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {displayPlan.branch_name}
                  </p>
                </div>
              </div>

              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Driver
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayPlan.driver_name || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {displayPlan.vehicle_plate &&
                    displayPlan.vehicle_plate !== "—"
                      ? `${displayPlan.vehicle_plate} ${displayPlan.vehicle_type_name ? `(${displayPlan.vehicle_type_name})` : ""}`
                      : displayPlan.vehicle_type_name || "No Vehicle Assigned"}
                  </p>
                </div>
              </div>

              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Orders
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    {details.length} order(s)
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {formatNumber(displayPlan.total_weight || 0)} kg
                  </p>
                </div>
              </div>
            </div>

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

            {/* Capacity Overview Section */}
            <div className="bg-background border rounded-xl p-4 space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">
                    Vehicle Capacity
                  </span>
                  <span className="text-[xs] font-bold text-foreground">
                    {formatNumber(displayPlan.total_weight || 0)} /{" "}
                    {formatNumber(displayPlan.maximum_weight || 0)} kg
                  </span>
                </div>
              </div>

              <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden ">
                <div
                  className={cn(
                    "h-full transition-all duration-500 flex items-center justify-center text-xs font-semibold text-white",
                    displayPlan.capacity_percentage! >= 100
                      ? "bg-destructive"
                      : displayPlan.capacity_percentage! >= 90
                        ? "bg-amber-500"
                        : "bg-blue-500",
                  )}
                  style={{
                    width: `${Math.min(displayPlan.capacity_percentage || 0, 100)}%`,
                  }}
                >
                  {displayPlan.capacity_percentage}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Current Load
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatNumber(displayPlan.total_weight || 0)} kg
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Capacity Remaining
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatNumber(
                      (displayPlan.maximum_weight || 0) -
                        (displayPlan.total_weight || 0),
                    )}{" "}
                    kg
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Total Value
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatPeso(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manifest Table Section - Fixed height Scrollbox */}
            <div className="bg-background border rounded-lg overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between shrink-0">
                <h4 className="text-xs font-semibold flex items-center gap-2">
                  Detailed Trip Manifest
                </h4>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {details.length} orders
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 grayscale opacity-40">
                  <div className="h-10 w-10 border-4 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm font-medium">
                    Resolving manifest details...
                  </p>
                </div>
              ) : (
                <div className="relative max-h-[400px] min-h-[150px] overflow-auto border-t">
                  <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 bg-background">
                      <tr className="hover:bg-transparent">
                        <th className="h-10 px-2 text-center align-middle font-bold text-[10px] uppercase tracking-wider w-12 text-foreground border-b">
                          #
                        </th>
                        <th className="h-10 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          SO Number
                        </th>
                        <th className="h-10 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Customer / Outlet
                        </th>
                        <th className="h-10 px-2 text-left align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Destination
                        </th>
                        <th className="h-10 px-2 text-right align-middle font-bold text-[10px] uppercase tracking-wider text-foreground border-b">
                          Weight (kg)
                        </th>
                        <th className="h-10 px-2 text-right align-middle font-bold text-[10px] uppercase tracking-wider text-foreground pr-4 border-b">
                          Amount (₱)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-medium">
                      {details.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-16 text-muted-foreground italic"
                          >
                            This dispatch plan has no sales orders attached.
                          </td>
                        </tr>
                      ) : (
                        details.map((detail, index) => (
                          <tr
                            key={detail.detail_id || index}
                            className="border-b transition-colors hover:bg-muted/50 group"
                          >
                            <td className="p-2 align-middle text-center text-xs text-muted-foreground w-12 border-b">
                              {index + 1}
                            </td>
                            <td className="p-2 align-middle text-xs font-semibold text-primary border-b">
                              {detail.order_no || "—"}
                            </td>
                            <td className="p-2 align-middle text-xs border-b">
                              {detail.customer_name || "—"}
                            </td>
                            <td className="p-2 align-middle text-[11px] text-muted-foreground border-b">
                              {[detail.city, detail.province]
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
          </div>
        </ScrollArea>

        {/* Footer Summary */}
        <div className="px-6 py-4 bg-muted/10 border-t flex items-center justify-between shrink-0">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Plan Total:{" "}
            <span className="text-foreground ml-1">
              {details.length} order(s)
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Weight
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground">
                {formatNumber(totalWeight)} kg
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Amount
              </span>
              <span className="text-lg font-bold tracking-tight text-primary">
                {formatPeso(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
