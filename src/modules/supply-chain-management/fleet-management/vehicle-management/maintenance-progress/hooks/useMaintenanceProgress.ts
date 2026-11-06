"use client";

import * as React from "react";
import type { VehicleJobOrder, VehiclePartOption, IssuePartsPayload, CompleteJOPayload } from "../types";
import {
  fetchInProgressJobOrders,
  fetchProgressOptions,
  issueJobOrderParts,
  completeJobOrder,
} from "../provider/fetchProviders";

export function useMaintenanceProgress() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [parts, setParts] = React.useState<VehiclePartOption[]>([]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const loadData = React.useCallback(async (branchId?: number | string) => {
    setLoading(true);
    try {
      const [jos, opt] = await Promise.all([
        fetchInProgressJobOrders(),
        fetchProgressOptions(branchId).catch(() => ({ parts: [] })),
      ]);
      setJobOrders(jos);
      setParts(opt.parts);
    } catch (err) {
      console.error("Error loading maintenance progress data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPartsForBranch = React.useCallback(async (branchId?: number | string) => {
    try {
      const opt = await fetchProgressOptions(branchId);
      setParts(opt.parts);
      return opt.parts;
    } catch {
      return [];
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const handleIssueParts = async (payload: IssuePartsPayload) => {
    setActionLoading(true);
    try {
      await issueJobOrderParts(payload);
      await loadData();
    } catch (err) {
      console.error("Error issuing parts:", err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJO = async (payload: CompleteJOPayload) => {
    setActionLoading(true);
    try {
      await completeJobOrder(payload);
      await loadData();
    } catch (err) {
      console.error("Error completing job order:", err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredJobOrders = React.useMemo(() => {
    return jobOrders.filter((jo) => {
      // Type Filter
      if (typeFilter !== "all" && jo.jo_type !== typeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const joNo = jo.jo_no?.toLowerCase() || "";
        const desc = jo.description?.toLowerCase() || "";
        const v = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? jo.vehicle_id : null;
        const plate = (v?.vehicle_plate || v?.plate_number || v?.name || "").toLowerCase();
        const makeModel = [v?.make, v?.model].filter(Boolean).join(" ").toLowerCase();

        return joNo.includes(q) || desc.includes(q) || plate.includes(q) || makeModel.includes(q);
      }

      return true;
    });
  }, [jobOrders, typeFilter, searchQuery]);

  // Paginated records
  const paginatedJobOrders = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredJobOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredJobOrders, currentPage, pageSize]);

  return {
    loading,
    actionLoading,
    jobOrders: paginatedJobOrders,
    rawJobOrders: jobOrders,
    totalCount: filteredJobOrders.length,
    parts,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    refresh: loadData,
    loadPartsForBranch,
    issueParts: handleIssueParts,
    completeJO: handleCompleteJO,
  };
}
