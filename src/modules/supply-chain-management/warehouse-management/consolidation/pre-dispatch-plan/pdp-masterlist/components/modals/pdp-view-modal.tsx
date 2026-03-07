"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import {
  Building,
  Calendar,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  User,
} from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="relative px-6 py-6 border-b shrink-0 overflow-hidden">
          {/* subtle header gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-background" />

          <div className="relative z-10 flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {displayPlan.dispatch_no}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Dispatch Plan Overview
                  </span>
                </div>
              </div>
            </div>

            <Badge
              variant={
                displayPlan.status === "Approved"
                  ? "default"
                  : displayPlan.status === "Dispatched"
                    ? "secondary"
                    : "outline"
              }
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                displayPlan.status === "Approved" &&
                  "bg-emerald-600 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200",
              )}
            >
              {displayPlan.status}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 bg-muted/5">
          <div className="p-6 space-y-6">
            {/* Trip Configuration Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Dispatch Date
                  </span>
                </div>
                <p className="font-semibold text-foreground truncate">
                  {formattedDate}
                </p>
              </div>

              <div className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Target Cluster
                  </span>
                </div>
                <p className="font-semibold text-foreground truncate">
                  {displayPlan.cluster_name || "—"}
                </p>
              </div>

              <div className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Building className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Source Branch
                  </span>
                </div>
                <p className="font-semibold text-foreground truncate">
                  {displayPlan.branch_name || "—"}
                </p>
              </div>

              <div className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Assigned Driver
                  </span>
                </div>
                <p className="font-semibold text-foreground truncate">
                  {displayPlan.driver_name || "—"}
                </p>
              </div>
            </div>

            {displayPlan.remarks && (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3">
                <div className="shrink-0 pt-0.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Remarks
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {displayPlan.remarks}
                  </p>
                </div>
              </div>
            )}

            {/* Manifest Table */}
            <div className="bg-background border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-muted/20 flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Trip Manifest
                </h4>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {details.length} line item(s)
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
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-14 text-center font-bold">
                        #
                      </TableHead>
                      <TableHead className="font-bold">SO Number</TableHead>
                      <TableHead className="font-bold">Customer Name</TableHead>
                      <TableHead className="font-bold">Destination</TableHead>
                      <TableHead className="text-right font-bold pr-6">
                        Amount (₱)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-16 text-muted-foreground italic font-medium"
                        >
                          This dispatch plan has no sales orders attached.
                        </TableCell>
                      </TableRow>
                    ) : (
                      details.map((detail, index) => (
                        <TableRow
                          key={detail.detail_id || index}
                          className="group hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="text-center text-xs font-bold text-muted-foreground/60 w-14">
                            {(index + 1).toString().padStart(2, "0")}
                          </TableCell>
                          <TableCell className="font-bold text-primary tracking-tight">
                            {detail.order_no || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {detail.customer_name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs leading-none">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 opacity-40" />
                              {[detail.city, detail.province]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums pr-6">
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
            </div>
          </div>
        </ScrollArea>

        {/* Footer Summary */}
        <div className="px-6 py-5 bg-background border-t flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary/60" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Total items in trip:{" "}
              <span className="text-foreground">{details.length}</span>
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              Total Manifest Value
            </span>
            <span className="text-xl font-black tracking-tight text-primary">
              ₱{" "}
              {totalAmount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
