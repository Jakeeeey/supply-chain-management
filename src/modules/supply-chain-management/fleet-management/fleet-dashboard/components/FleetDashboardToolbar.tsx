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
import { FleetDashboardCombobox, ComboboxOption } from "./FleetDashboardCombobox";
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
  licenseBranchFilter?: string;
  onLicenseBranchFilterChange?: (val: string) => void;
  vehicleStatusFilter?: string;
  onVehicleStatusFilterChange?: (val: string) => void;
  vehicleFuelFilter?: string;
  onVehicleFuelFilterChange?: (val: string) => void;
  vehicleFuelOptions?: string[];
  driverStatusFilter?: string;
  onDriverStatusFilterChange?: (val: string) => void;
  driverBranchFilter?: string;
  onDriverBranchFilterChange?: (val: string) => void;
  driverBranchOptions?: string[];
  joStatusFilter?: string;
  onJoStatusFilterChange?: (val: string) => void;
  joTypeFilter?: string;
  onJoTypeFilterChange?: (val: string) => void;
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
  licenseBranchFilter = "all",
  onLicenseBranchFilterChange,
  vehicleStatusFilter = "all",
  onVehicleStatusFilterChange,
  vehicleFuelFilter = "all",
  onVehicleFuelFilterChange,
  vehicleFuelOptions = [],
  driverStatusFilter = "all",
  onDriverStatusFilterChange,
  driverBranchFilter = "all",
  onDriverBranchFilterChange,
  driverBranchOptions = [],
  joStatusFilter = "all",
  onJoStatusFilterChange,
  joTypeFilter = "all",
  onJoTypeFilterChange,
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

  const fuelComboboxOptions = React.useMemo<ComboboxOption[]>(() => {
    return [
      { value: "all", label: "All Fuel Types" },
      ...vehicleFuelOptions.map((f) => ({ value: f, label: f })),
    ];
  }, [vehicleFuelOptions]);

  const driverBranchComboboxOptions = React.useMemo<ComboboxOption[]>(() => {
    return [
      { value: "all", label: "All Branches" },
      ...driverBranchOptions.map((b) => ({ value: b, label: b })),
    ];
  }, [driverBranchOptions]);

  const joTypeComboboxOptions = React.useMemo<ComboboxOption[]>(() => {
    return [
      { value: "all", label: "All Types" },
      { value: "repair", label: "Repair" },
      { value: "maintenance", label: "Maintenance" },
    ];
  }, []);

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
        {/* Vehicle Filters (Status, Branch, Fuel Type) */}
        {activeCard === "vehicles" && (
          <>
            {onVehicleStatusFilterChange && (
              <div className="w-full sm:w-40">
                <Select
                  value={vehicleStatusFilter}
                  onValueChange={onVehicleStatusFilterChange}
                >
                  <SelectTrigger className="h-9 w-full">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <span>All Statuses</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="maintenance">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Maintenance</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {onVehicleFuelFilterChange && (
              <div className="w-full sm:w-44">
                <FleetDashboardCombobox
                  options={fuelComboboxOptions}
                  value={vehicleFuelFilter}
                  onValueChange={onVehicleFuelFilterChange}
                  prefix="Fuel:"
                  placeholder="All Fuel Types"
                  searchPlaceholder="Search fuel type..."
                  className="w-full"
                  popoverWidth="w-[220px]"
                />
              </div>
            )}
          </>
        )}

        {/* Driver Filters (Status, Branch) */}
        {activeCard === "drivers" && (
          <>
            {onDriverStatusFilterChange && (
              <div className="w-full sm:w-40">
                <Select
                  value={driverStatusFilter}
                  onValueChange={onDriverStatusFilterChange}
                >
                  <SelectTrigger className="h-9 w-full">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <span>All Statuses</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="available">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Available</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="on trip">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>On Trip</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {onDriverBranchFilterChange && (
              <div className="w-full sm:w-48">
                <FleetDashboardCombobox
                  options={driverBranchComboboxOptions}
                  value={driverBranchFilter}
                  onValueChange={onDriverBranchFilterChange}
                  prefix="Branch:"
                  placeholder="All Branches"
                  searchPlaceholder="Search branch..."
                  className="w-full"
                  popoverWidth="w-[240px]"
                />
              </div>
            )}
          </>
        )}

        {activeCard === "licenses" && (
          <>
            {onLicenseStatusFilterChange && (
              <div className="w-full sm:w-48">
                <Select
                  value={licenseStatusFilter}
                  onValueChange={onLicenseStatusFilterChange}
                >
                  <SelectTrigger className="h-9 w-full">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <span>All Statuses</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="complete">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Complete</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="incomplete">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        <span>Incomplete</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="expiring_soon">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Expiring Soon</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="expired">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>Expired</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {onLicenseBranchFilterChange && (
              <div className="w-full sm:w-48">
                <FleetDashboardCombobox
                  options={driverBranchComboboxOptions}
                  value={licenseBranchFilter}
                  onValueChange={onLicenseBranchFilterChange}
                  prefix="Branch:"
                  placeholder="All Branches"
                  searchPlaceholder="Search branch..."
                  className="w-full"
                  popoverWidth="w-[240px]"
                />
              </div>
            )}
          </>
        )}

        {/* Job Orders Filters (Status, Type) */}
        {activeCard === "jo_pendings" && (
          <>
            {onJoStatusFilterChange && (
              <div className="w-full sm:w-44">
                <Select
                  value={joStatusFilter}
                  onValueChange={onJoStatusFilterChange}
                >
                  <SelectTrigger className="h-9 w-full">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <span>All Statuses</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="approved">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Approved</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>In Progress</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Pending</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {onJoTypeFilterChange && (
              <div className="w-full sm:w-44">
                <FleetDashboardCombobox
                  options={joTypeComboboxOptions}
                  value={joTypeFilter}
                  onValueChange={onJoTypeFilterChange}
                  prefix="Type:"
                  placeholder="All Types"
                  searchPlaceholder="Search type..."
                  className="w-full"
                  popoverWidth="w-[200px]"
                />
              </div>
            )}
          </>
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
