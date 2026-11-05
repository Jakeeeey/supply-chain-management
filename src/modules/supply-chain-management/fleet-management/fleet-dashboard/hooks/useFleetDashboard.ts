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

  // License filters for "licenses" view
  const [licenseStatusFilter, setLicenseStatusFilter] = React.useState<string>("all");
  const [licenseBranchFilter, setLicenseBranchFilter] = React.useState<string>("all");

  // Vehicle filters for "vehicles" view
  const [vehicleStatusFilter, setVehicleStatusFilter] = React.useState<string>("all");
  const [vehicleFuelFilter, setVehicleFuelFilter] = React.useState<string>("all");

  // Driver filters for "drivers" view
  const [driverStatusFilter, setDriverStatusFilter] = React.useState<string>("all");
  const [driverBranchFilter, setDriverBranchFilter] = React.useState<string>("all");

  // Job Order filters for "jo_pendings" view
  const [joStatusFilter, setJoStatusFilter] = React.useState<string>("all");
  const [joTypeFilter, setJoTypeFilter] = React.useState<string>("all");

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

  // Reset page & filters when card selection changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setLicenseStatusFilter("all");
    setLicenseBranchFilter("all");
    setVehicleStatusFilter("all");
    setVehicleFuelFilter("all");
    setDriverStatusFilter("all");
    setDriverBranchFilter("all");
    setJoStatusFilter("all");
    setJoTypeFilter("all");
  }, [activeCard]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    licenseStatusFilter,
    licenseBranchFilter,
    vehicleStatusFilter,
    vehicleFuelFilter,
    driverStatusFilter,
    driverBranchFilter,
    joStatusFilter,
    joTypeFilter,
  ]);

  // Filtered rows based on activeCard & searchQuery
  const currentList = React.useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();

    switch (activeCard) {
      case "vehicles": {
        let list = data.lists.vehicles || [];

        // Apply status dropdown filter
        if (vehicleStatusFilter !== "all") {
          list = list.filter(
            (v) => (v.status || "").toLowerCase().trim() === vehicleStatusFilter.toLowerCase().trim()
          );
        }

        // Apply fuel type dropdown filter
        if (vehicleFuelFilter !== "all") {
          list = list.filter((v) => {
            const fName = (v.fuel_type || "").trim().toLowerCase();
            return fName === vehicleFuelFilter.trim().toLowerCase();
          });
        }

        if (!q) return list;
        return list.filter(
          (item) =>
            item.plate_number.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q) ||
            (item.brand && item.brand.toLowerCase().includes(q)) ||
            (item.branch_name && item.branch_name.toLowerCase().includes(q)) ||
            (item.fuel_type && item.fuel_type.toLowerCase().includes(q))
        );
      }
      case "drivers": {
        let list = data.lists.drivers || [];

        // Apply status dropdown filter (e.g. Available, On Trip)
        if (driverStatusFilter !== "all") {
          list = list.filter(
            (d) => (d.status || "").toLowerCase().trim() === driverStatusFilter.toLowerCase().trim()
          );
        }

        // Apply branch dropdown filter
        if (driverBranchFilter !== "all") {
          list = list.filter((d) => {
            const bName = (d.branch_name || "").trim().toLowerCase();
            return bName === driverBranchFilter.trim().toLowerCase();
          });
        }

        if (!q) return list;
        return list.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.branch_name && item.branch_name.toLowerCase().includes(q)) ||
            (item.contact && item.contact.toLowerCase().includes(q)) ||
            (item.license_no && item.license_no.toLowerCase().includes(q)) ||
            (item.status && item.status.toLowerCase().includes(q))
        );
      }
      case "jo_pendings": {
        let list = data.lists.jo_pendings || [];

        // Apply status dropdown filter (All Statuses, Approved, In Progress, Pending)
        if (joStatusFilter !== "all") {
          list = list.filter((item) => {
            const st = (item.status || "").toLowerCase().trim();
            if (joStatusFilter === "pending") {
              return st === "pending" || st === "requested";
            }
            if (joStatusFilter === "approved") {
              return st === "approved";
            }
            if (joStatusFilter === "in_progress") {
              return st === "in progress" || st === "in-progress";
            }
            return st === joStatusFilter.toLowerCase().trim();
          });
        }

        // Apply type dropdown filter (All Types, Repair, Maintenance)
        if (joTypeFilter !== "all") {
          list = list.filter((item) => {
            const t = (item.jo_type || "").toLowerCase().trim();
            if (joTypeFilter === "maintenance") {
              return t.includes("maintenance");
            }
            if (joTypeFilter === "repair") {
              return t.includes("repair");
            }
            return t === joTypeFilter.toLowerCase().trim();
          });
        }

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
      case "licenses": {
        let list = data.lists.licenses || [];

        // Apply dropdown status filter (All Statuses, Complete, Incomplete, Expiring Soon, Expired)
        if (licenseStatusFilter !== "all") {
          list = list.filter((item) => {
            const st = item.status.toLowerCase();
            if (licenseStatusFilter === "expiring_soon") {
              return st === "expiring soon";
            }
            if (licenseStatusFilter === "complete") {
              return st === "valid";
            }
            if (licenseStatusFilter === "incomplete") {
              return st === "incomplete" || st === "no expiry date";
            }
            if (licenseStatusFilter === "expired") {
              return st === "expired";
            }
            return true;
          });
        }

        // Apply dropdown branch filter
        if (licenseBranchFilter !== "all") {
          list = list.filter((item) => {
            const bName = (item.branch_name || "").trim().toLowerCase();
            return bName === licenseBranchFilter.trim().toLowerCase();
          });
        }

        if (!q) return list;
        return list.filter(
          (item) =>
            item.driver_name.toLowerCase().includes(q) ||
            (item.branch_name && item.branch_name.toLowerCase().includes(q)) ||
            (item.license_no && item.license_no.toLowerCase().includes(q)) ||
            (item.license_classification && item.license_classification.toLowerCase().includes(q)) ||
            item.status.toLowerCase().includes(q) ||
            (item.contact && item.contact.toLowerCase().includes(q))
        );
      }
      default:
        return [];
    }
  }, [
    data,
    activeCard,
    searchQuery,
    licenseStatusFilter,
    licenseBranchFilter,
    vehicleStatusFilter,
    vehicleFuelFilter,
    driverStatusFilter,
    driverBranchFilter,
    joStatusFilter,
    joTypeFilter,
  ]);

  // Extract distinct branch options for drivers (Industrial division branches)
  const driverBranchOptions = React.useMemo(() => {
    if (!data?.lists.drivers) return [];
    const set = new Set<string>();
    for (const d of data.lists.drivers) {
      if (d.branch_name && d.branch_name.trim() && d.branch_name !== "—") {
        set.add(d.branch_name.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data?.lists.drivers]);

  const vehicleFuelOptions = React.useMemo(() => {
    if (!data?.lists.vehicles) return [];
    const set = new Set<string>();
    for (const v of data.lists.vehicles) {
      if (v.fuel_type && v.fuel_type.trim() && v.fuel_type !== "—") {
        set.add(v.fuel_type.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data?.lists.vehicles]);

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
    licenseStatusFilter,
    setLicenseStatusFilter,
    licenseBranchFilter,
    setLicenseBranchFilter,
    vehicleStatusFilter,
    setVehicleStatusFilter,
    vehicleFuelFilter,
    setVehicleFuelFilter,
    vehicleFuelOptions,
    driverStatusFilter,
    setDriverStatusFilter,
    driverBranchFilter,
    setDriverBranchFilter,
    driverBranchOptions,
    joStatusFilter,
    setJoStatusFilter,
    joTypeFilter,
    setJoTypeFilter,
    refresh: loadData,
  };
}
