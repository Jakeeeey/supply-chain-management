"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

import { useForArrivalSummary } from "./hooks/useForArrivalSummary";
import { FilterBar, SalesOrderCardList } from "./components";

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
    <div className="mx-auto max-w-[1600px] space-y-12 animate-in fade-in duration-700 pb-20 px-4 sm:px-6">
      {/* Header section */}
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Truck className="h-5 w-5 text-rose-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600/60">Fleet Operations</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground leading-[0.9]">
              For Arrival <span className="text-rose-600">Summary</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-xl">
              Sales Orders assigned to dispatch plans ready for arrival
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center justify-center bg-card/40 border border-border/40 shadow-xl rounded-[2rem] px-8 py-6 min-w-[120px] backdrop-blur-md transition-all hover:border-rose-500/30 group">
              <span className="text-5xl font-black tracking-tighter text-rose-600 transition-transform group-hover:scale-110 duration-500">
                {s.loading ? "..." : s.totalOrdersCount}
              </span>
              <div className="flex flex-col items-center leading-none mt-2 opacity-40">
                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">Sales</span>
                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">Orders</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-card/40 border border-border/40 shadow-xl rounded-[2rem] px-8 py-6 min-w-[120px] backdrop-blur-md transition-all hover:border-rose-500/30 group">
              <span className="text-5xl font-black tracking-tighter text-rose-600 transition-transform group-hover:scale-110 duration-500">
                {s.loading ? "..." : s.dispatchPlanGroups.length}
              </span>
              <div className="flex flex-col items-center leading-none mt-2 opacity-40">
                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">Dispatch</span>
                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">Plans</span>
              </div>
            </div>
          </div>
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

      {/* Sales Orders */}
      <SalesOrderCardList salesOrders={s.salesOrders} loading={s.loading} />
    </div>
  );
}
