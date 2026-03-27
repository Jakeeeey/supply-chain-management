import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, Filter, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { DispatchPlanSummary } from "../../creation/components/data-table/index";

interface DispatchListSidebarProps {
  plans: DispatchPlanSummary[];
  isLoading: boolean;
  selectedPlanId?: string;
  onSelectPlan: (plan: DispatchPlanSummary) => void;
}

export function DispatchListSidebar({
  plans,
  isLoading,
  selectedPlanId,
  onSelectPlan,
}: DispatchListSidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "budgeted">("all");

  const counts = useMemo(() => {
    return {
      all: plans.length,
      pending: plans.filter((p) => (p.budgetTotal || 0) === 0).length,
      budgeted: plans.filter((p) => (p.budgetTotal || 0) > 0).length,
    };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    let result = plans;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.dpNumber?.toLowerCase().includes(lower) ||
          p.driverName?.toLowerCase().includes(lower) ||
          p.vehiclePlateNo?.toLowerCase().includes(lower),
      );
    }

    if (filter === "pending") {
      result = result.filter((p) => (p.budgetTotal || 0) === 0);
    } else if (filter === "budgeted") {
      result = result.filter((p) => (p.budgetTotal || 0) > 0);
    }

    return result;
  }, [plans, search, filter]);

  return (
    <div className="w-96 border-r border-border/60 bg-muted/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/60 shrink-0 space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Active Dispatch Plans
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dispatch no. or driver..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Filter by Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => setFilter("all")}
                  className="text-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>All Plans</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {counts.all}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("pending")}
                  className="text-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Pending Budget</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {counts.pending}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("budgeted")}
                  className="text-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Budgeted</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {counts.budgeted}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[80vh]">
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-border/60 space-y-3"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="pt-2 border-t border-border/50 flex justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-1 flex flex-col items-end">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                No matching plans found
              </p>
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const hasBudget =
                (plan.budgetTotal || 0) > 0 ||
                (plan.status !== "For Approval" && plan.status !== "DRAFT");

              return (
                <div
                  key={plan.id}
                  onClick={() => onSelectPlan(plan)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200 text-left",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">
                      {plan.dpNumber}
                    </span>
                    {!hasBudget ? (
                      <Badge
                        variant="destructive"
                        className="h-5 text-[9px] px-1.5 rounded-sm"
                      >
                        Pending Budget
                      </Badge>
                    ) : (
                      <Badge
                        variant="default"
                        className="h-5 text-[9px] px-1.5 rounded-sm"
                      >
                        Budgeted
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 mt-3">
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {plan.driverName}
                      </span>
                      <span className="text-muted-foreground ml-auto whitespace-nowrap">
                        {plan.vehiclePlateNo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <div className="text-[10px] text-muted-foreground">
                        <p>Trip Value</p>
                        <p className="font-medium text-foreground tabular-nums">
                          ₱
                          {Number(plan.amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted-foreground ml-auto text-right">
                        <p>Total Budget</p>
                        <p
                          className={cn(
                            "font-medium tabular-nums",
                            hasBudget ? "text-emerald-600" : "text-destructive",
                          )}
                        >
                          {hasBudget
                            ? `₱${plan.budgetTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
