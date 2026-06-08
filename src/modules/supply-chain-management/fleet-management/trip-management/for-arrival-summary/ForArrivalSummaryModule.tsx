"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { useForArrivalSummary } from "./hooks/useForArrivalSummary";
import { FilterBar, KanbanBoard } from "./components";

export default function ForArrivalSummaryModule() {
  const s = useForArrivalSummary();

  if (s.error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Error: {s.error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            For Arrival Summary
          </h1>
          <p className="text-sm text-muted-foreground">
            Invoices assigned to inbound dispatch plans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-sm">
            {s.loading ? "..." : s.totalCount} Invoices
          </Badge>
          <Badge variant="outline" className="rounded-sm">
            {s.loading ? "..." : s.dispatchPlanGroups.length} Dispatch Plans
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <FilterBar
        search={s.search}
        onSearchChange={s.setSearch}
        driverFilter={s.driverFilter}
        onDriverFilterChange={s.setDriverFilter}
        uniqueDrivers={s.uniqueDrivers}
        vehicleFilter={s.vehicleFilter}
        onVehicleFilterChange={s.setVehicleFilter}
        uniqueVehicles={s.uniqueVehicles}
        customerFilter={s.customerFilter}
        onCustomerFilterChange={s.setCustomerFilter}
        uniqueCustomers={s.uniqueCustomers}
        onRefresh={s.reload}
        loading={s.loading}
      />

      <Separator />

      {/* Kanban Board */}
      <KanbanBoard dispatchPlanGroups={s.dispatchPlanGroups} loading={s.loading} />
    </div>
  );
}
