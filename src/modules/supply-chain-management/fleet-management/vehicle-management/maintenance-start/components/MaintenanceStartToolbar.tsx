"use client";

import * as React from "react";
import { Search, RefreshCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaintenanceStartToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: string;
  onTypeChange: (t: string) => void;
  onRefresh: () => void;
  approvedCount: number;
}

export function MaintenanceStartToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  onRefresh,
  approvedCount,
}: MaintenanceStartToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by JO#, vehicle plate, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5 opacity-50" />
            <SelectValue placeholder="All JO Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All JO Types</SelectItem>
            <SelectItem value="Repair" className="text-xs">Repair</SelectItem>
            <SelectItem value="Preventive Maintenance" className="text-xs">Preventive Maintenance</SelectItem>
            <SelectItem value="Inspection" className="text-xs">Inspection</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh} title="Refresh requests">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Ready to Start: <strong className="text-purple-600 font-semibold">{approvedCount}</strong>
      </div>
    </div>
  );
}
