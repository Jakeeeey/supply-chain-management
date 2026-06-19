"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { StockAdjustmentHeader } from "../types/stock-adjustment.schema";

/**
 * Hook for the Stock Adjustment **list page** only.
 *
 * Form-specific data (products, RFID, inventory lookups) lives in the
 * separate `useStockAdjustmentForm` hook so opening the form does NOT
 * re-fetch the adjustment list and vice-versa.
 */
export function useStockAdjustment(defaultStatus?: string) {
  const [rawData, setRawData] = useState<StockAdjustmentHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>(defaultStatus);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

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
      if (debouncedSearch) queryParams.set("search", debouncedSearch);
      if (branchId) queryParams.set("branchId", String(branchId));
      if (type) queryParams.set("type", type);
      // NOTE: status is filtered client-side to avoid Directus boolean filter issues

      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-posting?${queryParams.toString()}`
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
  }, [debouncedSearch, branchId, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Client-side status and date range filter — avoids Directus boolean/date inconsistencies
  const data = rawData.filter((item) => {
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

    // 2. From Date Filter (Inclusive)
    if (fromDate && item.created_at) {
      const itemDate = new Date(item.created_at);
      const filterFrom = new Date(fromDate);
      filterFrom.setHours(0, 0, 0, 0);
      if (itemDate < filterFrom) return false;
    }

    // 3. To Date Filter (Inclusive)
    if (toDate && item.created_at) {
      const itemDate = new Date(item.created_at);
      const filterTo = new Date(toDate);
      filterTo.setHours(23, 59, 59, 999);
      if (itemDate > filterTo) return false;
    }

    return true;
  });

  const deleteAdjustment = async (id: number) => {
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-posting/${id}`,
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

  return {
    data,  // already filtered by status client-side
    isLoading,
    error,
    refresh,
    deleteAdjustment,
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
