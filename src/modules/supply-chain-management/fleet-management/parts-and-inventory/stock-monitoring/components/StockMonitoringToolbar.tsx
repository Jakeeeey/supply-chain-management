"use client";

import * as React from "react";
import { Search, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { Branch } from "../../stock-in/types";
import type { VehiclePartClassification } from "../../registration/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableFilterSelect } from "./SearchableFilterSelect";

interface StockMonitoringToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  branchFilter: string;
  onBranchFilterChange: (val: string) => void;
  branches: Branch[];
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (val: string) => void;
  classifications: VehiclePartClassification[];
  viewMode: "branch" | "aggregated";
  onViewModeChange: (mode: "branch" | "aggregated") => void;
  onRefresh: () => void;
  loading: boolean;
}

export function StockMonitoringToolbar({
  search,
  onSearchChange,
  branchFilter,
  onBranchFilterChange,
  branches,
  statusFilter,
  onStatusFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  classifications,
  viewMode,
  onViewModeChange,
  onRefresh,
  loading,
}: StockMonitoringToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, name, barcode..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>

          {viewMode === "branch" && (
            <div className="w-[180px]">
              <SearchableFilterSelect
                options={[
                  { value: "all", label: "All Branches" },
                  ...branches.map((b) => ({ value: String(b.id), label: b.branch_name })),
                ]}
                value={branchFilter}
                onValueChange={onBranchFilterChange}
                placeholder="All Branches"
                contentWidth="w-[200px]"
              />
            </div>
          )}

          <div className="w-[180px]">
            <SearchableFilterSelect
              options={[
                { value: "all", label: "All Classifications" },
                ...classifications.map((c) => ({ value: c.name, label: c.name })),
              ]}
              value={classificationFilter}
              onValueChange={onClassificationFilterChange}
              placeholder="All Classifications"
              contentWidth="w-[210px]"
            />
          </div>

          <div className="w-[150px]">
            <SearchableFilterSelect
              options={[
                { value: "all", label: "All Status" },
                { value: "in_stock", label: "In Stock" },
                { value: "low_stock", label: "Low Stock Alert" },
                { value: "out_of_stock", label: "Out of Stock" },
              ]}
              value={statusFilter}
              onValueChange={onStatusFilterChange}
              placeholder="All Status"
              contentWidth="w-[170px]"
            />
          </div>

          <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div>
          <Tabs
            value={viewMode}
            onValueChange={(val) => onViewModeChange(val as "branch" | "aggregated")}
          >
            <TabsList className="grid w-[240px] grid-cols-2">
              <TabsTrigger value="branch">Per Branch</TabsTrigger>
              <TabsTrigger value="aggregated">Aggregated</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
