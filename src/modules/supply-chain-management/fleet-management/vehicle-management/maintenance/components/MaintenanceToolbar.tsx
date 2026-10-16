"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "./SearchableSelect";
import { Search, Plus, RotateCcw, Wrench } from "lucide-react";

interface MaintenanceToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  typeFilter: string;
  onTypeChange: (val: string) => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  counts: {
    all: number;
    requested: number;
    approved: number;
    inProgress: number;
    completed: number;
  };
}

export function MaintenanceToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  onOpenCreate,
  onRefresh,
  counts,
}: MaintenanceToolbarProps) {
  const typeFilterOptions = [
    { value: "all", label: "All JO Types" },
    { value: "Repair", label: "Repair" },
    { value: "Preventive Maintenance", label: "Preventive Maintenance" },
    { value: "Inspection", label: "Inspection" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Vehicle Maintenance & Job Orders
          </h2>
          <p className="text-sm text-muted-foreground">
            Track repairs, approve mechanic assignments, issue parts, and monitor vehicle maintenance lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={onOpenCreate} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" />
            Create JO Request
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto">
        <Tabs value={statusFilter} onValueChange={onStatusChange} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="all">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="requested">
              Requested ({counts.requested})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger value="in progress">
              In Progress ({counts.inProgress})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and Secondary Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by JO #, plate number, vehicle make/model, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="w-full sm:w-56">
          <SearchableSelect
            options={typeFilterOptions}
            value={typeFilter}
            onValueChange={onTypeChange}
            placeholder="All JO Types"
          />
        </div>
      </div>
    </div>
  );
}
