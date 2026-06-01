"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, Search, Filter } from "lucide-react";
import { EnrichedApprovedPlan, ReadinessFilter } from "../../../types/dispatch.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";

interface PdpListSidebarProps {
  approvedPlans: EnrichedApprovedPlan[];
  filteredPlans: EnrichedApprovedPlan[];
  readinessFilter: ReadinessFilter;
  onFilterChange: (filter: ReadinessFilter) => void;
  isLoadingPlans: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  selectedPlanIds: number[];
  onPlanSelect: (planId: string) => void;
  selectedBranch: number;
  currentTotalWeight: number;
  vehicleCapacity: number;
}

export function PdpListSidebar({
  approvedPlans,
  filteredPlans,
  readinessFilter,
  onFilterChange,
  isLoadingPlans,
  searchQuery,
  onSearchChange,
  onLoadMore,
  hasMore,
  selectedPlanIds,
  onPlanSelect,
  selectedBranch,
  currentTotalWeight,
  vehicleCapacity,
}: PdpListSidebarProps) {
  const counts = useMemo(() => ({
    all: approvedPlans.length,
    ready: approvedPlans.filter(p => p.is_selectable).length,
    partial: approvedPlans.filter(p => p.readiness_reason === "Partial Picking").length,
    unconsolidated: approvedPlans.filter(p => p.readiness_reason === "Unconsolidated").length,
    invalid: approvedPlans.filter(p => p.readiness_reason === "Invalid Status").length,
  }), [approvedPlans]);

  return (
    <div className="w-sm flex flex-col overflow-hidden bg-muted/20">
      {/* Search */}
      <div className="p-4 border-b border-border/50 space-y-3 bg-background/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pre-Dispatch Plan
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border/60"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className={cn(
                  "h-8 w-8 shrink-0",
                  readinessFilter !== "all" && "text-primary border-primary/50 bg-primary/5"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onFilterChange("all")}
                className={cn("text-xs flex items-center justify-between cursor-pointer", readinessFilter === "all" && "bg-accent")}
              >
                <span>All Plans</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-4 justify-center">{counts.all}</Badge>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onFilterChange("ready")}
                className={cn("text-xs flex items-center justify-between cursor-pointer", readinessFilter === "ready" && "bg-accent")}
              >
                <span>Ready for Dispatch</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-4 justify-center">{counts.ready}</Badge>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onFilterChange("Partial Picking")}
                className={cn("text-xs flex items-center justify-between cursor-pointer", readinessFilter === "Partial Picking" && "bg-accent")}
              >
                <span>Partially Applied</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-4 justify-center">{counts.partial}</Badge>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onFilterChange("Unconsolidated")}
                className={cn("text-xs flex items-center justify-between cursor-pointer", readinessFilter === "Unconsolidated" && "bg-accent")}
              >
                <span>Unconsolidated</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-4 justify-center">{counts.unconsolidated}</Badge>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onFilterChange("Invalid Status")}
                className={cn("text-xs flex items-center justify-between cursor-pointer", readinessFilter === "Invalid Status" && "bg-accent")}
              >
                <span>Invalid Status</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-4 justify-center">{counts.invalid}</Badge>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Plan list */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1.5">
            {!selectedBranch || selectedBranch === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
                <p className="text-xs">Select a source branch first.</p>
              </div>
            ) : approvedPlans.length === 0 && isLoadingPlans ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
                <p className="text-xs">
                  {readinessFilter !== "all" 
                    ? `No plans with status "${readinessFilter}"`
                    : "No approved plans for this branch."}
                </p>
              </div>
            ) : (
              <>
                {filteredPlans.map((p) => {
                  const pId = Number(p.dispatch_id);
                  const isSelected = selectedPlanIds.includes(pId);
                  const planWeight = Number(p.total_weight || 0);
                  const isNotSelectable = !p.is_selectable;
                  const wouldExceed =
                    !isSelected &&
                    vehicleCapacity > 0 &&
                    currentTotalWeight + planWeight > vehicleCapacity;

                  const isDisabled = wouldExceed || isNotSelectable;

                  return (
                    <button
                      type="button"
                      key={pId}
                      onClick={() => !isDisabled && onPlanSelect(String(pId))}
                      disabled={isDisabled}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border text-sm transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : isDisabled
                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                            : "border-border/50 bg-background hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={isDisabled ? "outline" : "default"}
                              className={cn(
                                "text-[9px] font-medium tracking-wide px-1.5 py-0 h-4 rounded-full",
                                isNotSelectable && p.readiness_reason === "Partial Picking" && "border-orange-500/50 text-orange-600 bg-orange-50",
                                isNotSelectable && p.readiness_reason === "Unconsolidated" && "border-slate-400/50 text-slate-500 bg-slate-50",
                                isNotSelectable && p.readiness_reason === "Invalid Status" && "border-destructive/30 text-destructive/70"
                              )}
                            >
                              {wouldExceed 
                                ? "Limit Reached" 
                                : isNotSelectable 
                                  ? (p.readiness_reason === "Partial Picking" ? "Partially Applied" : p.readiness_reason || "Not Ready")
                                  : (p.status === "Picked" ? "Applied" : p.status)}
                            </Badge>
                            <p className={cn(
                              "font-semibold text-xs truncate",
                              isDisabled ? "text-muted-foreground" : "text-foreground"
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
                              isDisabled ? "border-muted/30" : "border-border"
                            )} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className={cn(
                          "text-xs font-semibold",
                          isDisabled ? "text-muted-foreground" : "text-foreground"
                        )}>
                          ₱
                          {Number(p.total_amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className={cn(
                          "text-[10px] font-medium",
                          isDisabled ? "text-destructive/60" : "text-muted-foreground"
                        )}>
                          {planWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                        </p>
                      </div>
                    </button>
                  );
                })}
                
                {hasMore ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs mt-2" 
                    onClick={onLoadMore}
                    disabled={isLoadingPlans}
                  >
                    {isLoadingPlans ? "Loading..." : "Load More"}
                  </Button>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] text-muted-foreground">End of list</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
