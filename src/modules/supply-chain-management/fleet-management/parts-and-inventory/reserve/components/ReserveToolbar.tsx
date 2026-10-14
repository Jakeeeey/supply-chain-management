"use client";

import * as React from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import type { JobOrderRef } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "./SearchableSelect";

interface ReserveToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedJoFilter: string;
  onJoFilterChange: (val: string) => void;
  jobOrders: JobOrderRef[];
  onOpenIssueModal: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function ReserveToolbar({
  search,
  onSearchChange,
  selectedJoFilter,
  onJoFilterChange,
  jobOrders,
  onOpenIssueModal,
  onRefresh,
  loading,
}: ReserveToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2 max-w-lg">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search JO no, part code, part name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="w-[200px]">
          <SearchableSelect
            options={[
              { value: "all", label: "All Job Orders" },
              ...jobOrders.map((jo) => ({ value: String(jo.id), label: jo.jo_no })),
            ]}
            value={selectedJoFilter}
            onValueChange={onJoFilterChange}
            placeholder="All Job Orders"
            contentWidth="w-[220px]"
          />
        </div>

        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onOpenIssueModal} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Issue Parts to JO
        </Button>
      </div>
    </div>
  );
}
