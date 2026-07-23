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
    <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
      {/* Search */}
      <div className="relative flex-1 group w-full">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-rose-500 transition-colors" />
        <Input
          id="for-arrival-search"
          placeholder="Search sales order, customer, driver..."
          className="pl-14 h-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm text-lg font-bold transition-all focus:ring-rose-500/20 focus:border-rose-500/40 w-full"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full lg:w-auto">
        {/* Driver Filter */}
        <div className="w-full sm:w-auto sm:flex-1 lg:flex-none">
          <Combobox
            value={driverFilter}
            onValueChange={onDriverFilterChange}
            placeholder="All Drivers"
            emptyMessage="No drivers found"
            options={[
              { value: "All Drivers", label: "All Drivers" },
              ...uniqueDrivers.map((name) => ({ value: name, label: name }))
            ]}
            className="h-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm text-base font-bold transition-all hover:border-rose-500/30 w-full lg:min-w-[180px]"
          />
        </div>

        {/* Vehicle Filter */}
        <div className="w-full sm:w-auto sm:flex-1 lg:flex-none">
          <Combobox
            value={vehicleFilter}
            onValueChange={onVehicleFilterChange}
            placeholder="All Vehicles"
            emptyMessage="No vehicles found"
            options={[
              { value: "All Vehicles", label: "All Vehicles" },
              ...uniqueVehicles.map((plate) => ({ value: plate, label: plate }))
            ]}
            className="h-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm text-base font-bold transition-all hover:border-rose-500/30 w-full lg:min-w-[180px]"
          />
        </div>

        {/* Customer Filter */}
        <div className="w-full sm:w-auto sm:flex-1 lg:flex-none">
          <Combobox
            value={customerFilter}
            onValueChange={onCustomerFilterChange}
            placeholder="All Customers"
            emptyMessage="No customers found"
            options={[
              { value: "All Customers", label: "All Customers" },
              ...uniqueCustomers.map((name) => ({ value: name, label: name }))
            ]}
            className="h-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm text-base font-bold transition-all hover:border-rose-500/30 w-full lg:min-w-[180px]"
          />
        </div>

        {/* Refresh */}
        <Button
          id="for-arrival-refresh"
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm hover:bg-rose-500/5 hover:border-rose-500/30 text-muted-foreground transition-all active:scale-95 shrink-0"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCcw
            className={`h-6 w-6 ${loading ? "animate-spin text-rose-600" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}
