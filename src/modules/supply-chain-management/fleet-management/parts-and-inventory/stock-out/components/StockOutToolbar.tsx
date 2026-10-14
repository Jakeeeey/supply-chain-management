"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCw, PlusCircle } from "lucide-react";
import type { Branch } from "../../stock-in/types";
import { SearchableStockOutSelect } from "./SearchableStockOutSelect";

interface StockOutToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedBranch: string;
  onBranchChange: (val: string) => void;
  selectedType: string;
  onTypeChange: (val: string) => void;
  branches: Branch[];
  loading: boolean;
  onRefresh: () => void;
  onOpenRecordModal: () => void;
}

export function StockOutToolbar({
  search,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  selectedType,
  onTypeChange,
  branches,
  loading,
  onRefresh,
  onOpenRecordModal,
}: StockOutToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search part, ref#, remarks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-[190px]">
          <SearchableStockOutSelect
            options={[
              { value: "all", label: "All Branches" },
              ...branches.map((b) => ({ value: String(b.id), label: b.branch_name })),
            ]}
            value={selectedBranch}
            onValueChange={onBranchChange}
            placeholder="All Branches"
            contentWidth="w-[210px]"
          />
        </div>

        <div className="w-full sm:w-[170px]">
          <SearchableStockOutSelect
            options={[
              { value: "all", label: "All Outbound Types" },
              { value: "Issue", label: "JO Issuance" },
              { value: "Scrap", label: "Scrap / Waste" },
              { value: "Damage", label: "Damaged" },
              { value: "Disposal", label: "Disposal" },
              { value: "Adjustment", label: "Audit Adjustment" },
            ]}
            value={selectedType}
            onValueChange={onTypeChange}
            placeholder="All Outbound Types"
            contentWidth="w-[190px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 text-xs gap-1"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button
          size="sm"
          onClick={onOpenRecordModal}
          className="h-9 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
        >
          <PlusCircle className="h-4 w-4" />
          Record Stock Out / Scrap
        </Button>
      </div>
    </div>
  );
}
