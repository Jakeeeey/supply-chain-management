"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { usePDPFilter } from "../../context/PDPFilterContext";
import { DispatchPlanMasterData } from "../../types/dispatch-plan.schema";

interface PDPGlobalFilterProps {
  masterData: DispatchPlanMasterData | null;
  showStatus?: boolean;
}

export function PDPGlobalFilter({
  masterData,
  showStatus = true,
}: PDPGlobalFilterProps) {
  const {
    clusterId,
    setClusterId,
    status,
    setStatus,
    branchId,
    setBranchId,
    dispatchDate,
    setDispatchDate,
    resetFilters,
  } = usePDPFilter();

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        {/* Date Filter */}
        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "h-8 w-[160px] justify-start text-left text-xs",
                !dispatchDate,
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dispatchDate ? (
                format(parseISO(dispatchDate), "PPP")
              ) : (
                <span>Select Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dispatchDate ? parseISO(dispatchDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  // Format as YYYY-MM-DD in local time
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setDispatchDate(`${y}-${m}-${d}`);
                } else {
                  setDispatchDate(null);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Branch Filter */}
        <Select
          value={branchId ? String(branchId) : "all"}
          onValueChange={(v) => setBranchId(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs font-medium">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {masterData?.branches?.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.branch_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cluster Filter */}
        <Select
          value={clusterId ? String(clusterId) : "all"}
          onValueChange={(v) => setClusterId(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs font-medium">
            <SelectValue placeholder="All Clusters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {masterData?.clusters?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.cluster_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        {showStatus && (
          <Select
            value={status || "all"}
            onValueChange={(v) => setStatus(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs font-medium">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Picking">Picking</SelectItem>
              <SelectItem value="Picked">Picked</SelectItem>
              <SelectItem value="Dispatched">Dispatched</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={resetFilters}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
