"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
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
  const { clusterId, setClusterId, status, setStatus, resetFilters } =
    usePDPFilter();

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
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
