"use client";

import * as React from "react";
import type { ForDispatchInvoice, DispatchPlanGroup } from "../types/for-dispatch-summary.types";
import { fetchForDispatchSummaryClient } from "../services/for-dispatch-summary.repo";
import { buildDispatchPlanGroup, matchesSearch } from "../services/for-dispatch-summary.helpers";

export function useForDispatchSummary() {
  const [invoices, setInvoices] = React.useState<ForDispatchInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [driverFilter, setDriverFilter] = React.useState("All Drivers");
  const [vehicleFilter, setVehicleFilter] = React.useState("All Vehicles");
  const [customerFilter, setCustomerFilter] = React.useState("All Customers");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchForDispatchSummaryClient();
      setInvoices(data);
    } catch (e) {
      setInvoices([]);
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Filtered invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      if (search && !matchesSearch(inv, search)) return false;

      if (driverFilter !== "All Drivers") {
        const driverName = `${inv.driverFirstName} ${inv.driverLastName}`.trim();
        if (driverName !== driverFilter) return false;
      }

      if (vehicleFilter !== "All Vehicles") {
        if (inv.vehiclePlate !== vehicleFilter) return false;
      }

      if (customerFilter !== "All Customers") {
        if (inv.customerName !== customerFilter) return false;
      }

      return true;
    });
  }, [invoices, search, driverFilter, vehicleFilter, customerFilter]);

  // Group by dispatch plan
  const dispatchPlanGroups = React.useMemo<DispatchPlanGroup[]>(() => {
    const grouped = new Map<string, ForDispatchInvoice[]>();

    for (const inv of filteredInvoices) {
      const planKey = inv.dispatchDocNo || inv.dispatchPlanId;
      if (!grouped.has(planKey)) grouped.set(planKey, []);
      grouped.get(planKey)!.push(inv);
    }

    const groups = Array.from(grouped.entries()).map(([planKey, invs]) =>
      buildDispatchPlanGroup(planKey, invs)
    );

    // Sort descending by estimated dispatch date (latest on left)
    groups.sort((a, b) => {
      const dateA = a.estimatedTimeOfDispatch || "";
      const dateB = b.estimatedTimeOfDispatch || "";
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return 0;
    });

    return groups;
  }, [filteredInvoices]);

  // Flat list of all sales orders
  const salesOrders = React.useMemo(() => {
    return dispatchPlanGroups.flatMap((group) => group.salesOrders);
  }, [dispatchPlanGroups]);

  // Unique values for filter dropdowns
  const uniqueDrivers = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      const name = `${inv.driverFirstName} ${inv.driverLastName}`.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [invoices]);

  const uniqueVehicles = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.vehiclePlate) set.add(inv.vehiclePlate);
    });
    return Array.from(set).sort();
  }, [invoices]);

    const uniqueCustomers = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.customerName && inv.customerName !== "Unknown Customer") {
        set.add(inv.customerName);
      }
    });
    return Array.from(set).sort();
  }, [invoices]);

  const totalOrdersCount = React.useMemo(() => {
    const uniqueOrders = new Set<string>();
    filteredInvoices.forEach(inv => {
      if (inv.orderId) uniqueOrders.add(inv.orderId);
    });
    return uniqueOrders.size;
  }, [filteredInvoices]);

  return {
    invoices,
    filteredInvoices,
    dispatchPlanGroups,
    loading,
    error,

    search,
    setSearch,
    driverFilter,
    setDriverFilter,
    vehicleFilter,
    setVehicleFilter,
    customerFilter,
    setCustomerFilter,

    uniqueDrivers,
    uniqueVehicles,
    uniqueCustomers,
    salesOrders,

    totalOrdersCount,
    reload,
  };
}
