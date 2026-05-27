"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { StockAdjustmentManualHeader } from "../types/stock-adjustment-manual.schema";

/**
 * Hook for the Stock Adjustment **list page** only.
 *
 * Form-specific data (products, RFID, inventory lookups) lives in the
 * separate `useStockAdjustmentManualForm` hook so opening the form does NOT
 * re-fetch the adjustment list and vice-versa.
 */
export function useStockAdjustmentManual() {
  const [rawData, setRawData] = useState<StockAdjustmentManualHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default to 10 as per user screenshot

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
  }, [search]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (branchId) queryParams.set("branchId", String(branchId));
      if (type) queryParams.set("type", type);
      // NOTE: search is filtered client-side to support branch/supplier name matching

      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual?${queryParams.toString()}`
      );
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      setRawData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to load stock adjustments");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Client-side filtering for status and date range
  const filteredData = rawData.filter((item) => {
    // 1. Status Filter
    if (status) {
      const rawPosted = item.isPosted as unknown;
      let posted: boolean;
      if (rawPosted && typeof rawPosted === 'object' && 'data' in rawPosted) {
        posted = (rawPosted as { data: number[] }).data?.[0] === 1;
      } else {
        posted = Number(rawPosted) === 1;
      }
      if (status === "Posted" && !posted) return false;
      if (status === "Unposted" && posted) return false;
    }

    // 2. From Date Filter
    if (fromDate && item.created_at) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
      if (new Date(item.created_at) < startOfDay) return false;
    }

    // 3. To Date Filter
    if (toDate && item.created_at) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(item.created_at) > endOfDay) return false;
    }

    // 4. Client-side search check (doc_no, remarks, branch name, supplier name)
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      const docNo = (item.doc_no || "").toLowerCase();
      const remarks = (item.remarks || "").toLowerCase();

      const branchName = (
        typeof item.branch_id === "object"
          ? item.branch_id?.branch_name
          : item.branch_id
      )?.toString().toLowerCase() || "";

      const supplierName = (
        typeof item.supplier_id === "object"
          ? item.supplier_id?.supplier_name
          : item.supplier_id
      )?.toString().toLowerCase() || "";

      if (
        !docNo.includes(term) &&
        !remarks.includes(term) &&
        !branchName.includes(term) &&
        !supplierName.includes(term)
      ) {
        return false;
      }
    }

    return true;
  });

  // Reset pagination to first page when any filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, branchId, type, status, fromDate, toDate]);

  // Calculate paginated slice of filtered adjustments
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const deleteAdjustment = async (id: number) => {
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual/${id}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      toast.success("Adjustment deleted successfully");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete adjustment");
      throw err;
    }
  };

  const resetFilters = useCallback(() => {
    setSearch("");
    setBranchId(undefined);
    setType(undefined);
    setStatus(undefined);
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setPageSize(10);
  }, []);

  return {
    data: paginatedData, // Expose the sliced dataset for active view
    totalItems,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    isLoading,
    error,
    refresh,
    deleteAdjustment,
    resetFilters,
    filters: {
      search, setSearch,
      branchId, setBranchId,
      type, setType,
      status, setStatus,
      fromDate, setFromDate,
      toDate, setToDate,
    },
  };
}
