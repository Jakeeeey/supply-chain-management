"use client";

import * as React from "react";
import { Search, RotateCw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardCardType } from "../types";

interface FleetDashboardToolbarProps {
  activeCard: DashboardCardType;
  query: string;
  onQueryChange: (val: string) => void;
  onRefresh: () => void;
  loading: boolean;
  totalCount: number;
  licenseStatusFilter?: string;
  onLicenseStatusFilterChange?: (val: string) => void;
}

export function FleetDashboardToolbar({
  activeCard,
  query,
  onQueryChange,
  onRefresh,
  loading,
  totalCount,
  licenseStatusFilter = "all",
  onLicenseStatusFilterChange,
}: FleetDashboardToolbarProps) {
  const titles: Record<DashboardCardType, { title: string; subtitle: string; placeholder: string }> = {
    vehicles: {
      title: "Vehicle Records",
      subtitle: "Listing of all registered company vehicles",
      placeholder: "Search by plate number, model, status...",
    },
    drivers: {
      title: "Driver Records",
      subtitle: "Listing of all registered fleet drivers",
      placeholder: "Search by driver name, branch, license...",
    },
    jo_pendings: {
      title: "Pending Job Orders",
      subtitle: "Active maintenance and repair work orders",
      placeholder: "Search by JO number, vehicle plate, type...",
    },
    outside: {
      title: "Vehicles Outside Company",
      subtitle: "Vehicles currently dispatched and in-transit",
      placeholder: "Search by DP number, plate, driver, status...",
    },
    licenses: {
      title: "Driver Licenses",
      subtitle: "Compliance and expiration tracking for all driver licenses",
      placeholder: "Search by driver name, license no., branch...",
    },
  };

  const currentMeta = titles[activeCard];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{currentMeta.title}</h2>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {totalCount}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{currentMeta.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {activeCard === "licenses" && onLicenseStatusFilterChange && (
          <div className="w-full sm:w-52">
            <Select
              value={licenseStatusFilter}
              onValueChange={onLicenseStatusFilterChange}
            >
              <SelectTrigger className="h-9 w-full">
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>All Statuses</span>
                  </div>
                </SelectItem>
                <SelectItem value="expiring_soon">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Expiring Soon (&le; 30d)</span>
                  </div>
                </SelectItem>
                <SelectItem value="expired">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Expired</span>
                  </div>
                </SelectItem>
                <SelectItem value="valid">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Valid</span>
                  </div>
                </SelectItem>
                <SelectItem value="incomplete">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>Incomplete / No Expiry</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={currentMeta.placeholder}
            className="pl-9 h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 gap-1.5"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>
    </div>
  );
}
