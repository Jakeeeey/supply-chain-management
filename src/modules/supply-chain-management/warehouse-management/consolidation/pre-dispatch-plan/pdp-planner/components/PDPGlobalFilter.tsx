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
import { format } from "date-fns";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { usePDPFilter } from "../../context/PDPFilterContext";
import { Combobox as PDPCombobox } from "../../pdp-creation/components/Combobox";
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
    stagedClusterId,
    setStagedClusterId,
    stagedStatus,
    setStagedStatus,
    stagedBranchId,
    setStagedBranchId,
    stagedDateRange,
    setStagedDateRange,
    applyFilters,
    resetFilters,
    isDirty,
  } = usePDPFilter();

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "h-8 w-fit justify-start text-left text-xs font-medium",
                !stagedDateRange,
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {stagedDateRange?.from ? (
                stagedDateRange.to ? (
                  <>
                    {format(stagedDateRange.from, "LLL dd, y")} -{" "}
                    {format(stagedDateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(stagedDateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Date Range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={stagedDateRange?.from}
              selected={stagedDateRange}
              onSelect={setStagedDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Branch Filter */}
        <PDPCombobox
          options={[
            { value: "", label: "All Branches" },
            ...(masterData?.branches?.map((b) => ({
              value: String(b.id),
              label: b.branch_name,
            })) || []),
          ]}
          value={stagedBranchId ? String(stagedBranchId) : ""}
          onValueChange={(v) => setStagedBranchId(v ? Number(v) : null)}
          placeholder="Search Branch..."
          className="h-8 w-fit text-xs"
        />

        {/* Cluster Filter */}
        <PDPCombobox
          options={[
            { value: "", label: "All Clusters" },
            ...(masterData?.clusters?.map((c) => ({
              value: String(c.id),
              label: c.cluster_name,
            })) || []),
          ]}
          value={stagedClusterId ? String(stagedClusterId) : ""}
          onValueChange={(v) => setStagedClusterId(v ? Number(v) : null)}
          placeholder="Search Cluster..."
          className="h-8 w-fit text-xs"
        />

        {/* Status Filter */}
        {showStatus && (
          <Select
            value={stagedStatus || "all"}
            onValueChange={(v) => setStagedStatus(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs font-medium">
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

        {/* Apply Button */}
        <Button
          size="sm"
          className={cn(
            "h-8 px-4 text-xs font-semibold transition-all",
            isDirty
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground opacity-70",
          )}
          onClick={applyFilters}
          disabled={!isDirty}
        >
          Apply Filters
        </Button>

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
