"use client";

import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useEffect, useState } from "react";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Masterlist sub-module.
 * Manages the full list of dispatch plans across all statuses.
 * @returns State and actions for PDP masterlist
 */
export function usePreDispatchMasterlist() {
  // ─── Plans State ──────────────────────────────────
  const [plansData, setPlansData] = useState<DispatchPlan[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(0);
  const [plansLimit, setPlansLimit] = useState(10);

  // ─── Shared State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ─── Fetch All Plans ──────────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_PATH}?limit=${plansLimit}&offset=${plansPage * plansLimit}&search=${encodeURIComponent(search)}`,
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setPlansData(result.data || []);
      setPlansTotal(result.meta?.filter_count || result.meta?.total_count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [plansLimit, plansPage, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Fetch Plan Details ───────────────────────────
  const fetchPlanDetails = useCallback(
    async (
      id: number | string,
    ): Promise<{ plan: DispatchPlan; details: DispatchPlanDetail[] }> => {
      const res = await fetch(`${API_PATH}/${id}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    [],
  );

  return {
    plansData,
    plansTotal,
    plansPage,
    setPlansPage,
    plansLimit,
    setPlansLimit,

    isLoading,
    error,
    search,
    setSearch,
    refresh,

    fetchPlanDetails,
  };
}
