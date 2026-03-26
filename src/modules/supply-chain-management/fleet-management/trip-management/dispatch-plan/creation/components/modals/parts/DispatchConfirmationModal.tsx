import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import { DispatchCreationMasterData } from "../../../types/dispatch.types";
import { PlanDetailItem } from "./types";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DispatchConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  payload: any;
  masterData: DispatchCreationMasterData;
  planDetails: PlanDetailItem[];
  approvedPlans: any[];
}

export function DispatchConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  payload,
  masterData,
  planDetails,
  approvedPlans,
}: DispatchConfirmationModalProps) {
  if (!payload || !open) return null;

  // Computations
  const startingPointNode = masterData?.branches?.find(
    (b: { id: number; branch_name: string }) => b.id === payload.starting_point
  );
  const startingPointName = startingPointNode?.branch_name || "Unknown";

  const totalTransactions = planDetails.filter(
    (d) => !d.isManualStop && !d.isPoStop
  ).length;

  const totalStops = planDetails.length;

  const totalDistance = planDetails.reduce(
    (sum, d) => sum + (d.distance || 0),
    0
  );

  const deliveryDays = 1.0; // Default or could be computed

  const tripAmount = payload.amount || 0;

  const selectedPdps = payload.pre_dispatch_plan_ids || [];

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-xl border border-border/60 shadow-xl">
        <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            New Dispatch Plan
            <Badge variant="secondary" className="font-mono text-xs font-medium px-2 py-0.5 ml-2">
              DRAFT
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col p-6 space-y-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Starting Point
              </span>
              <span className="font-medium text-foreground">{startingPointName}</span>
            </div>

            <div className="flex flex-col gap-1 border-b border-border/40 pb-2 text-right">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Transactions
              </span>
              <span className="font-medium text-foreground">{totalTransactions}</span>
            </div>

            <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Stops
              </span>
              <span className="font-medium text-foreground">{totalStops}</span>
            </div>

            <div className="flex flex-col gap-1 border-b border-border/40 pb-2 text-right">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Distance
              </span>
              <span className="font-medium text-foreground">
                {totalDistance > 0 ? `${totalDistance} km` : "0"}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Delivery Days
              </span>
              <span className="font-medium text-foreground">
                {deliveryDays.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-border/40 pb-2 text-right">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Trip Amount
              </span>
              <span className="font-medium text-foreground tabular-nums">
                ₱{Number(tripAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Pre Dispatch Plans ({selectedPdps.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPdps.map((id: number) => {
                const p = approvedPlans.find((plan) => plan.dispatch_id === id);
                return (
                  <Badge
                    key={id}
                    variant="outline"
                    className="flex flex-col items-start px-3 py-1.5 gap-0.5 bg-background shadow-sm hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {p?.dispatch_no || id}
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn("font-semibold", isSubmitting && "opacity-80")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Dispatch...
              </>
            ) : (
              <>
                Confirm & Create
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
