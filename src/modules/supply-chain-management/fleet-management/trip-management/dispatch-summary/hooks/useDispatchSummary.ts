"use client";

import * as React from "react";
import type { DateFilter, DispatchPlan, DispatchSummaryStats } from "../types";
import { fetchDispatchSummary } from "../providers/fetchProviders";
import { getStatusCategory } from "../utils/status";
import { buildWeeklyTrendData } from "../utils/weeklyTrend";

export function useDispatchSummary() {
  const [dispatchPlans, setDispatchPlans] = React.useState<DispatchPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Table filters
  const [statusFilter, setStatusFilter] = React.useState<string>("All Statuses");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("All Time");
  const [customStartDate, setCustomStartDate] = React.useState<string>("");
  const [customEndDate, setCustomEndDate] = React.useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Print dialog
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [printDriver, setPrintDriver] = React.useState("All Drivers");
  const [printSalesman, setPrintSalesman] = React.useState("All Salesmen");
  const [printVehicle, setPrintVehicle] = React.useState("All Vehicles");
  const [printStatus, setPrintStatus] = React.useState("All Statuses (Full Matrix)");
  const [printDateRange, setPrintDateRange] = React.useState("This Month");
  const [printCustomStart, setPrintCustomStart] = React.useState("");
  const [printCustomEnd, setPrintCustomEnd] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchDispatchSummary({ limit: -1 });
      setDispatchPlans(data);
    } catch (e: any) {
      setDispatchPlans([]);
      setError(e?.message || "Failed to load dispatch summary");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Base visible list: Active only
  const visibleTablePlans = React.useMemo(() => {
    return dispatchPlans.filter((p) => {
      const cat = getStatusCategory(p.status);
      return cat === "For Dispatch" || cat === "For Inbound" || cat === "For Clearance";
    });
  }, [dispatchPlans]);

  const filteredTableData = React.useMemo(() => {
    return visibleTablePlans.filter((plan) => {
      if (statusFilter !== "All Statuses") {
        const cat = getStatusCategory(plan.status);
        if (cat !== statusFilter) return false;
      }

      if (dateFilter !== "All Time") {
        const planDate = new Date(plan.createdAt);
        const now = new Date();

        if (dateFilter === "This Week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return planDate >= startOfWeek;
        }

        if (dateFilter === "This Month") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return planDate >= startOfMonth;
        }

        if (dateFilter === "This Year") {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          return planDate >= startOfYear;
        }

        if (dateFilter === "Custom" && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return planDate >= start && planDate <= end;
        }
      }

      return true;
    });
  }, [visibleTablePlans, statusFilter, dateFilter, customStartDate, customEndDate]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredTableData.length]);

  const totalPages = Math.max(1, Math.ceil(filteredTableData.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = filteredTableData.slice(indexOfFirstItem, indexOfLastItem);

  const stats: DispatchSummaryStats = React.useMemo(() => {
    return visibleTablePlans.reduce(
      (acc, dp) => {
        const cat = getStatusCategory(dp.status);
        acc.total += 1;
        if (cat === "For Dispatch") acc.forDispatch += 1;
        if (cat === "For Inbound") acc.forInbound += 1;
        if (cat === "For Clearance") acc.forClearance += 1;
        return acc;
      },
      { total: 0, forDispatch: 0, forInbound: 0, forClearance: 0 }
    );
  }, [visibleTablePlans]);

  const statusChartData = React.useMemo(() => {
    return [
      { name: "For Dispatch", value: stats.forDispatch, colorKey: "blue" },
      { name: "For Inbound", value: stats.forInbound, colorKey: "purple" },
      { name: "For Clearance", value: stats.forClearance, colorKey: "pink" },
    ].filter((x) => x.value > 0);
  }, [stats]);

  const weeklyTrendData = React.useMemo(() => buildWeeklyTrendData(visibleTablePlans), [visibleTablePlans]);

  const uniqueDrivers = React.useMemo(
    () => Array.from(new Set(visibleTablePlans.map((p) => p.driverName).filter(Boolean))),
    [visibleTablePlans]
  );
  const uniqueSalesmen = React.useMemo(
    () => Array.from(new Set(visibleTablePlans.map((p) => p.salesmanName).filter(Boolean))),
    [visibleTablePlans]
  );
  const uniqueVehicles = React.useMemo(
    () => Array.from(new Set(visibleTablePlans.map((p) => p.vehiclePlateNo).filter(Boolean))),
    [visibleTablePlans]
  );
  const uniqueStatuses = React.useMemo(
    () => Array.from(new Set(visibleTablePlans.map((p) => p.status).filter(Boolean))),
    [visibleTablePlans]
  );

  return {
    // data
    dispatchPlans,
    visibleTablePlans,
    filteredTableData,
    currentTableData,
    loading,
    error,

    // table filters
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,

    // pagination
    currentPage,
    setCurrentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    itemsPerPage,

    // stats/charts
    stats,
    statusChartData,
    weeklyTrendData,

    // print
    isPrintOpen,
    setIsPrintOpen,
    printDriver,
    setPrintDriver,
    printSalesman,
    setPrintSalesman,
    printVehicle,
    setPrintVehicle,
    printStatus,
    setPrintStatus,
    printDateRange,
    setPrintDateRange,
    printCustomStart,
    setPrintCustomStart,
    printCustomEnd,
    setPrintCustomEnd,

    // uniques
    uniqueDrivers,
    uniqueSalesmen,
    uniqueVehicles,
    uniqueStatuses,

    // actions
    reload,
  };
}
