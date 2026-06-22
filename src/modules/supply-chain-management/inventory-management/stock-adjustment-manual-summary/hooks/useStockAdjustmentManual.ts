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
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [branches, setBranches] = useState<{ id: number; branch_name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; supplier_name: string }[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default to 10 as per user screenshot

  // Fetch filters lookup lists on mount
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const branchRes = await fetch("/api/scm/inventory-management/stock-adjustment-manual-registration/branches");
        const branchData = await branchRes.json();
        if (branchData.data) setBranches(branchData.data);

        const supplierRes = await fetch("/api/scm/inventory-management/stock-adjustment-manual-registration/suppliers");
        const supplierData = await supplierRes.json();
        if (supplierData.data) setSuppliers(supplierData.data);
      } catch (err) {
        console.error("Failed to load summary lookups:", err);
      }
    };
    fetchLookups();
  }, []);

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
        `/api/scm/inventory-management/stock-adjustment-manual-summary?${queryParams.toString()}`
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

  // Client-side filtering for status, supplier and date range
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

    // 2. Supplier Filter
    if (supplierId) {
      const sId = typeof item.supplier_id === 'object' ? item.supplier_id?.id : item.supplier_id;
      if (Number(sId) !== supplierId) return false;
    }

    // 3. From Date Filter
    if (fromDate && item.created_at) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
      if (new Date(item.created_at) < startOfDay) return false;
    }

    // 4. To Date Filter
    if (toDate && item.created_at) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(item.created_at) > endOfDay) return false;
    }

    // 5. Client-side search check (doc_no, remarks, branch name, supplier name)
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
  }, [debouncedSearch, branchId, supplierId, type, status, fromDate, toDate]);

  // Calculate paginated slice of filtered adjustments
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const deleteAdjustment = async (id: number) => {
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual-posting/${id}`,
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
    setSupplierId(undefined);
    setType(undefined);
    setStatus(undefined);
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setPageSize(10);
  }, []);

  // Compute Metrics Dashboard Stats based on filteredData (all matches, pre-pagination)
  const totalStockIn = filteredData
    .filter(item => item.type === "IN")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalStockOut = filteredData
    .filter(item => item.type === "OUT")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const grossAdjustedValue = totalStockIn + totalStockOut;
  const netStockImpact = totalStockIn - totalStockOut;

  let postedCount = 0;
  let draftCount = 0;
  filteredData.forEach(item => {
    const rawPosted = item.isPosted as unknown;
    let posted: boolean;
    if (rawPosted && typeof rawPosted === 'object' && 'data' in rawPosted) {
      posted = (rawPosted as { data: number[] }).data?.[0] === 1;
    } else {
      posted = Number(rawPosted) === 1;
    }
    if (posted) {
      postedCount++;
    } else {
      draftCount++;
    }
  });

  const postingRate = filteredData.length > 0 ? (postedCount / filteredData.length) * 100 : 0;

  let itemsAdjusted = 0;
  filteredData.forEach(item => {
    if (Array.isArray(item.items)) {
      itemsAdjusted += item.items.reduce((sum, subItem) => sum + (Number(subItem.quantity) || 0), 0);
    }
  });

  const activeBranchesSet = new Set<number>();
  filteredData.forEach(item => {
    const bId = typeof item.branch_id === 'object' ? item.branch_id?.id : item.branch_id;
    if (bId) activeBranchesSet.add(Number(bId));
  });
  const branchesActive = activeBranchesSet.size;

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
    branches,
    suppliers,
    stats: {
      grossAdjustedValue,
      totalStockIn,
      totalStockOut,
      postingRate,
      postedCount,
      draftCount,
      itemsAdjusted,
      branchesActive,
      netStockImpact,
    },
    filters: {
      search, setSearch,
      branchId, setBranchId,
      supplierId, setSupplierId,
      type, setType,
      status, setStatus,
      fromDate, setFromDate,
      toDate, setToDate,
    },
  };
}
