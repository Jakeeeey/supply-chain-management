//src/modules/vehicle-management/vehicle-list/components/VehicleListToolbar.tsx
"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VehicleListToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  onAdd,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header row: stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold">List of Vehicles</div>
          <div className="text-sm text-muted-foreground">
            Manage and view all vehicles in your fleet
          </div>
        </div>

        {/* Mobile: full-width button */}
        <Button className="w-full gap-2 sm:w-auto" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Search & Filter row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search: flex-1 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by plate no., vehicle name, or driver..."
            className="w-full pl-9"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange("all")}
            className="h-9 px-4"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange("active")}
            className="flex h-9 items-center gap-2 px-4"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Active
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusFilterChange("inactive")}
            className="flex h-9 items-center gap-2 px-4"
          >
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            Inactive
          </Button>
        </div>
      </div>
    </div>
  );
}
