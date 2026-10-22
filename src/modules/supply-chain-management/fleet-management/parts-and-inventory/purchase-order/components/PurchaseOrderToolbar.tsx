"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCw, PlusCircle } from "lucide-react";
import type { Branch } from "../../stock-in/types";
import { SearchableSelect } from "./SearchableSelect";

interface PurchaseOrderToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedBranch: string;
  onBranchChange: (val: string) => void;
  branches: Branch[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenBulkModal?: () => void;
}

export function PurchaseOrderToolbar({
  search,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  branches,
  loading,
  onRefresh,
  onOpenCreateModal,
  onOpenBulkModal,
}: PurchaseOrderToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search part code, name, branch, PR#..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <SearchableSelect
            options={[
              { value: "all", label: "All Branches" },
              ...branches.map((b) => ({ value: String(b.id), label: b.branch_name })),
            ]}
            value={selectedBranch}
            onValueChange={onBranchChange}
            placeholder="All Branches"
            contentWidth="w-[220px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
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

        {onOpenBulkModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBulkModal}
            className="h-9 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Bulk / Multi-Part PO
          </Button>
        )}

        <Button
          size="sm"
          onClick={onOpenCreateModal}
          className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <PlusCircle className="h-4 w-4" />
          Single PO
        </Button>
      </div>
    </div>
  );
}
