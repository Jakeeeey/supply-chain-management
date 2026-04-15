"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, Search } from "lucide-react";
import { EnrichedApprovedPlan } from "../../../types/dispatch.types";

interface PdpListSidebarProps {
  approvedPlans: EnrichedApprovedPlan[];
  isLoadingPlans: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedPlanIds: number[];
  onPlanSelect: (planId: string) => void;
  selectedBranch: number;
  currentTotalWeight: number;
  vehicleCapacity: number;
}

export function PdpListSidebar({
  approvedPlans,
  isLoadingPlans,
  searchQuery,
  onSearchChange,
  selectedPlanIds,
  onPlanSelect,
  selectedBranch,
  currentTotalWeight,
  vehicleCapacity,
}: PdpListSidebarProps) {
  const filteredPlans = approvedPlans.filter(
    (p) =>
      p.dispatch_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cluster_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-sm flex flex-col overflow-hidden bg-muted/20">
      {/* Search */}
      <div className="p-4 border-b border-border/50 space-y-3 bg-background/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pre-Dispatch Plan
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-background border-border/60"
          />
        </div>
      </div>

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {!selectedBranch || selectedBranch === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
            <p className="text-xs">Select a source branch first.</p>
          </div>
        ) : isLoadingPlans ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
            <p className="text-xs">No approved plans for this branch.</p>
          </div>
        ) : (
          filteredPlans.map((p) => {
            const pId = Number(p.dispatch_id);
            const isSelected = selectedPlanIds.includes(pId);
            const planWeight = Number(p.total_weight || 0);
            const wouldExceed =
              !isSelected &&
              vehicleCapacity > 0 &&
              currentTotalWeight + planWeight > vehicleCapacity;

            return (
              <button
                type="button"
                key={pId}
                onClick={() => !wouldExceed && onPlanSelect(String(pId))}
                disabled={wouldExceed}
                className={cn(
                  "w-full text-left p-3 rounded-lg border text-sm transition-all duration-150",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : wouldExceed
                      ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                      : "border-border/50 bg-background hover:border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={wouldExceed ? "outline" : "default"}
                        className={cn(
                          "text-[9px] font-medium tracking-wide px-1.5 py-0 h-4 rounded-full",
                          wouldExceed && "border-destructive/30 text-destructive/70"
                        )}
                      >
                        {wouldExceed ? "Limit Reached" : p.status}
                      </Badge>
                      <p className={cn(
                        "font-semibold text-xs truncate",
                        wouldExceed ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {p.dispatch_no}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.cluster_name || "Unassigned"} · {p.total_items || 0}{" "}
                      items
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        wouldExceed ? "border-muted/30" : "border-border"
                      )} />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className={cn(
                    "text-xs font-semibold",
                    wouldExceed ? "text-muted-foreground" : "text-foreground"
                  )}>
                    ₱
                    {Number(p.total_amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className={cn(
                    "text-[10px] font-medium",
                    wouldExceed ? "text-destructive/60" : "text-muted-foreground"
                  )}>
                    {planWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
