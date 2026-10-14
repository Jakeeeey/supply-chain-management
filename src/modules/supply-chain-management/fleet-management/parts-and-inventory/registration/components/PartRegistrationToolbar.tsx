"use client";

import * as React from "react";
import { Plus, Search, RefreshCw, Layers } from "lucide-react";
import type { VehiclePartClassification } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PartRegistrationToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  classifications: VehiclePartClassification[];
  onAddClick: () => void;
  onAddClassificationClick: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function PartRegistrationToolbar({
  search,
  onSearchChange,
  classificationFilter,
  onClassificationFilterChange,
  statusFilter,
  onStatusFilterChange,
  classifications,
  onAddClick,
  onAddClassificationClick,
  onRefresh,
  loading,
}: PartRegistrationToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search part code, name, barcode..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={classificationFilter} onValueChange={onClassificationFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classifications</SelectItem>
            {classifications.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onAddClassificationClick} className="gap-1.5">
          <Layers className="h-4 w-4" />
          Classification
        </Button>
        <Button onClick={onAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Register Part
        </Button>
      </div>
    </div>
  );
}
