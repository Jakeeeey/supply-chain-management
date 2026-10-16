"use client";

import * as React from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import type { Branch } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableBranchSelect } from "./SearchableBranchSelect";

interface StockInToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  branchFilter: string;
  onBranchFilterChange: (val: string) => void;
  branches: Branch[];
  onOpenBatchStockIn: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function StockInToolbar({
  search,
  onSearchChange,
  branchFilter,
  onBranchFilterChange,
  branches,
  onOpenBatchStockIn,
  onRefresh,
  loading,
}: StockInToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2 max-w-lg">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ref no, part code, remarks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="w-[180px]">
          <SearchableBranchSelect
            options={[
              { value: "all", label: "All Branches" },
              ...branches.map((b) => ({ value: String(b.id), label: b.branch_name })),
            ]}
            value={branchFilter}
            onValueChange={onBranchFilterChange}
            placeholder="All Branches"
          />
        </div>

        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onOpenBatchStockIn} className="gap-2">
          <Plus className="h-4 w-4" />
          Stock In Items
        </Button>
      </div>
    </div>
  );
}
