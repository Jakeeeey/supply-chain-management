"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "./Combobox";
import { RefreshCcw, Search } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;

  driverFilter: string;
  onDriverFilterChange: (value: string) => void;
  uniqueDrivers: string[];

  vehicleFilter: string;
  onVehicleFilterChange: (value: string) => void;
  uniqueVehicles: string[];

  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
  uniqueCustomers: string[];

  onRefresh: () => void;
  loading: boolean;
}

export function FilterBar({
  search,
  onSearchChange,
  driverFilter,
  onDriverFilterChange,
  uniqueDrivers,
  vehicleFilter,
  onVehicleFilterChange,
  uniqueVehicles,
  customerFilter,
  onCustomerFilterChange,
  uniqueCustomers,
  onRefresh,
  loading,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap sm:items-center sm:gap-3 lg:gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="for-dispatch-search"
          placeholder="Search invoice, customer, driver..."
          className="h-9 rounded-md pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Driver Filter */}
      <Combobox
        value={driverFilter}
        onValueChange={onDriverFilterChange}
        placeholder="All Drivers"
        emptyMessage="No drivers found"
        options={[
          { value: "All Drivers", label: "All Drivers" },
          ...uniqueDrivers.map((name) => ({ value: name, label: name }))
        ]}
        className="h-9 w-full sm:w-[170px] lg:w-[180px] shrink-0"
      />

      {/* Vehicle Filter */}
      <Combobox
        value={vehicleFilter}
        onValueChange={onVehicleFilterChange}
        placeholder="All Vehicles"
        emptyMessage="No vehicles found"
        options={[
          { value: "All Vehicles", label: "All Vehicles" },
          ...uniqueVehicles.map((plate) => ({ value: plate, label: plate }))
        ]}
        className="h-9 w-full sm:w-[150px] lg:w-[160px] shrink-0"
      />

      {/* Customer Filter */}
      <Combobox
        value={customerFilter}
        onValueChange={onCustomerFilterChange}
        placeholder="All Customers"
        emptyMessage="No customers found"
        options={[
          { value: "All Customers", label: "All Customers" },
          ...uniqueCustomers.map((name) => ({ value: name, label: name }))
        ]}
        className="h-9 w-full sm:w-[180px] lg:w-[200px] shrink-0"
        align="end"
      />

      {/* Refresh */}
      <Button
        id="for-dispatch-refresh"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-md"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCcw
          className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
        />
      </Button>
    </div>
  );
}
