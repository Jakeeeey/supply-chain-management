"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
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
      setIsLoading(true);
      fetchDetails(plan.dispatch_id)
        .then((result) => {
          setEnrichedPlan(result.plan);
          setDetails(result.details);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setDetails([]);
      setEnrichedPlan(null);
    }
  }, [open, plan, fetchDetails]);

  const displayPlan = enrichedPlan || plan;
  if (!displayPlan) return null;

  const totalAmount = details.reduce((sum, d) => sum + (d.amount || 0), 0);

  const formattedDate = displayPlan.dispatch_date
    ? new Date(displayPlan.dispatch_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {displayPlan.dispatch_no}
            </DialogTitle>
            <Badge
              variant={
                displayPlan.status === "Approved"
                  ? "default"
                  : displayPlan.status === "Dispatched"
                    ? "secondary"
                    : "outline"
              }
              className="capitalize"
            >
              {displayPlan.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Trip Configuration Summary */}
        <div className="px-6 py-4 border-b shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Dispatch Date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cluster</p>
              <p className="font-medium">{displayPlan.cluster_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Branch</p>
              <p className="font-medium">{displayPlan.branch_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Driver</p>
              <p className="font-medium">{displayPlan.driver_name || "—"}</p>
            </div>
          </div>
          {displayPlan.remarks && (
            <div className="mt-3">
              <p className="text-muted-foreground text-xs">Remarks</p>
              <p className="text-sm">{displayPlan.remarks}</p>
            </div>
          )}
        </div>

        {/* Manifest */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading details...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Amount (₱)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No sales orders in this plan
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((detail, index) => (
                    <TableRow key={detail.detail_id || index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {detail.order_no || "—"}
                      </TableCell>
                      <TableCell>{detail.customer_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[detail.city, detail.province]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {(detail.amount || 0).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Footer Summary */}
        <Separator />
        <div className="px-6 py-3 flex items-center justify-between text-sm shrink-0">
          <span className="text-muted-foreground">
            {details.length} order(s) in manifest
          </span>
          <span className="font-semibold">
            Total Value: ₱
            {totalAmount.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
