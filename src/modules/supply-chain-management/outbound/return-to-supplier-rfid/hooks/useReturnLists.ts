"use client";

// =============================================================================
// useReturnLists — Fetches and manages the RTS list view data
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { listTransactions } from "../providers/fetchProviders";
import type { ReturnToSupplier } from "../types/rts.schema";

/**
 * Hook for fetching and managing Return-to-Supplier list data.
 * Provides standardized `{ data, isLoading, error, refresh }` shape.
 *
 * @returns {object} The list state and refresh function.
 * @returns {ReturnToSupplier[]} data - Array of mapped RTS transactions.
 * @returns {boolean} isLoading - True while the initial or refresh fetch is in progress.
 * @returns {string | null} error - Error message if the last fetch failed.
 * @returns {() => void} refresh - Triggers a re-fetch of the list data.
 */
export function useReturnLists() {
  const [data, setData] = useState<ReturnToSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listTransactions();
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load return transactions.";
      setError(message);
      toast.error("Fetch Error", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
