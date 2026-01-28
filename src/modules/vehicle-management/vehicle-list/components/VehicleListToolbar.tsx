"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VehicleListToolbar({
  query,
  onQueryChange,
  onAdd,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">List of Vehicles</div>
          <div className="text-sm text-muted-foreground">
            Manage and view all vehicles in your fleet
          </div>
        </div>

        <Button className="gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by plate no., vehicle name, or driver..."
          className="pl-9"
        />
      </div>
    </div>
  );
}
