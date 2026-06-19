"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Search */}
      <div className="relative flex-1">
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
        onValueChange={(val) => onDriverFilterChange(val as string)}
      >
        <ComboboxInput
          id="for-dispatch-driver-filter"
          placeholder="All Drivers"
          className="h-9 w-full sm:w-[180px]"
        />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="All Drivers">All Drivers</ComboboxItem>
            {uniqueDrivers.map((name) => (
              <ComboboxItem key={name} value={name}>
                {name}
              </ComboboxItem>
            ))}
            {uniqueDrivers.length === 0 && (
              <ComboboxEmpty>No drivers found</ComboboxEmpty>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {/* Vehicle Filter */}
      <Combobox
        value={vehicleFilter}
        onValueChange={(val) => onVehicleFilterChange(val as string)}
      >
        <ComboboxInput
          id="for-dispatch-vehicle-filter"
          placeholder="All Vehicles"
          className="h-9 w-full sm:w-[160px]"
        />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="All Vehicles">All Vehicles</ComboboxItem>
            {uniqueVehicles.map((plate) => (
              <ComboboxItem key={plate} value={plate}>
                {plate}
              </ComboboxItem>
            ))}
            {uniqueVehicles.length === 0 && (
              <ComboboxEmpty>No vehicles found</ComboboxEmpty>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {/* Customer Filter */}
      <Combobox
        value={customerFilter}
        onValueChange={(val) => onCustomerFilterChange(val as string)}
      >
        <ComboboxInput
          id="for-dispatch-customer-filter"
          placeholder="All Customers"
          className="h-9 w-full sm:w-[200px]"
        />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="All Customers">All Customers</ComboboxItem>
            {uniqueCustomers.map((name) => (
              <ComboboxItem key={name} value={name}>
                {name}
              </ComboboxItem>
            ))}
            {uniqueCustomers.length === 0 && (
              <ComboboxEmpty>No customers found</ComboboxEmpty>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

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
