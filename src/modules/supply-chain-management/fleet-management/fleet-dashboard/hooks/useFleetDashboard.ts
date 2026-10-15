"use client";

import * as React from "react";
import type { DashboardCardType, FleetDashboardResponse } from "../types";
import { fetchFleetDashboardData } from "../provider/fetchProviders";

export function useFleetDashboard() {
  const [data, setData] = React.useState<FleetDashboardResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active card selected for detailed table view
  const [activeCard, setActiveCard] = React.useState<DashboardCardType>("vehicles");

  // Search filter
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 10;

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFleetDashboardData();
      setData(res);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when card selection or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [activeCard]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filtered rows based on activeCard & searchQuery
  const currentList = React.useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();

    switch (activeCard) {
      case "vehicles": {
        const list = data.lists.vehicles || [];
        if (!q) return list;
        return list.filter(
          (item) =>
            item.plate_number.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q) ||
            (item.brand && item.brand.toLowerCase().includes(q))
        );
      }
      case "drivers": {
        const list = data.lists.drivers || [];
        if (!q) return list;
        return list.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.branch_name && item.branch_name.toLowerCase().includes(q)) ||
            (item.contact && item.contact.toLowerCase().includes(q)) ||
            (item.license_no && item.license_no.toLowerCase().includes(q))
        );
      }
      case "jo_pendings": {
        const list = data.lists.jo_pendings || [];
        if (!q) return list;
        return list.filter(
          (item) =>
            item.jo_no.toLowerCase().includes(q) ||
            (item.vehicle_plate && item.vehicle_plate.toLowerCase().includes(q)) ||
            item.jo_type.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q) ||
            item.priority.toLowerCase().includes(q)
        );
      }
      case "outside": {
        const list = data.lists.outside || [];
        if (!q) return list;
        return list.filter(
          (item) =>
            item.doc_no.toLowerCase().includes(q) ||
            item.vehicle_plate.toLowerCase().includes(q) ||
            item.driver_name.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q)
        );
      }
      default:
        return [];
    }
  }, [data, activeCard, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));

  const paginatedList = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage, pageSize]);

  return {
    data,
    loading,
    error,
    activeCard,
    setActiveCard,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: currentList.length,
    paginatedList,
    refresh: loadData,
  };
}
