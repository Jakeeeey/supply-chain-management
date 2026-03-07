"use client";

import {
  DispatchPlan,
  DispatchPlanDetail,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useEffect, useState } from "react";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Approval sub-module.
 * Manages pending-for-approval plans list and approve/reject actions.
 * @returns State and actions for PDP approval
 */
export function usePreDispatchApproval() {
  // ─── Pending Plans State ──────────────────────────
  const [pendingData, setPendingData] = useState<DispatchPlan[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);

  // ─── Shared State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ─── Fetch Pending Plans ──────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_PATH}?status=Pending&limit=${pendingLimit}&offset=${pendingPage * pendingLimit}&search=${encodeURIComponent(search)}`,
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setPendingData(result.data || []);
      setPendingTotal(
        result.meta?.filter_count || result.meta?.total_count || 0,
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pendingLimit, pendingPage, search]);

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

  // ─── Mutations ────────────────────────────────────

  /**
   * Approves a single dispatch plan.
   */
  const approvePlan = async (id: number | string) => {
    const response = await fetch(`${API_PATH}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  return {
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,

    isLoading,
    error,
    search,
    setSearch,
    refresh,

    fetchPlanDetails,
    approvePlan,
  };
}
