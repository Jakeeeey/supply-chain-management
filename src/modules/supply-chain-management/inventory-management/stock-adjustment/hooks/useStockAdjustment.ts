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
export function useStockAdjustment() {
  const [rawData, setRawData] = useState<StockAdjustmentHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

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
        `/api/scm/inventory-management/stock-adjustment?${queryParams.toString()}`
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

  // Client-side status filter — avoids Directus boolean filter inconsistencies
  const data = rawData.filter((item) => {
    if (!status) return true;
    // Directus may return isPosted as a Buffer, number (0/1), or boolean
    const rawPosted = item.isPosted as unknown;
    let posted: boolean;
    if (rawPosted && typeof rawPosted === 'object' && 'data' in rawPosted) {
      posted = (rawPosted as { data: number[] }).data?.[0] === 1;
    } else {
      posted = Number(rawPosted) === 1;
    }
    if (status === "Posted") return posted;
    if (status === "Unposted") return !posted;
    return true;
  });

  const deleteAdjustment = async (id: number) => {
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment/${id}`,
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
    },
  };
}
