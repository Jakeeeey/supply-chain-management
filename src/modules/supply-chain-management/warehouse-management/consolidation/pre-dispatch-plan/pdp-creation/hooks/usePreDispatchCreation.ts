"use client";

import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanFormValues,
  DispatchPlanMasterData,
  SalesOrderOption,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useEffect, useState } from "react";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Creation sub-module.
 * Manages pending plans list, master data, available orders,
 * and plan creation/update mutations.
 * @returns State and actions for PDP creation
 */
export function usePreDispatchCreation() {
  // ─── Pending Plans State ──────────────────────────
  const [pendingData, setPendingData] = useState<DispatchPlan[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);

  // ─── Master Data ──────────────────────────────────
  const [masterData, setMasterData] = useState<DispatchPlanMasterData | null>(
    null,
  );

  // ─── Available Orders ─────────────────────────────
  const [availableOrders, setAvailableOrders] = useState<SalesOrderOption[]>(
    [],
  );
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // ─── Shared State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ─── Fetch Pending Plans + Master Data ────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, masterRes] = await Promise.all([
        fetch(
          `${API_PATH}?status=Pending&limit=${pendingLimit}&offset=${pendingPage * pendingLimit}&search=${encodeURIComponent(search)}`,
        ).then((r) => r.json()),
        fetch(`${API_PATH}?type=master`).then((r) => r.json()),
      ]);

      if (plansRes.error) throw new Error(plansRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setPendingData(plansRes.data || []);
      setPendingTotal(
        plansRes.meta?.filter_count || plansRes.meta?.total_count || 0,
      );
      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pendingLimit, pendingPage, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Fetch Available Orders by Cluster ────────────
  const fetchAvailableOrders = useCallback(
    async (clusterId?: number, orderSearch?: string) => {
      setIsLoadingOrders(true);
      try {
        const params = new URLSearchParams({ type: "available_orders" });
        if (clusterId) params.set("cluster_id", String(clusterId));
        if (orderSearch) params.set("search", orderSearch);

        const res = await fetch(`${API_PATH}?${params.toString()}`);
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        setAvailableOrders(result.data || []);
      } catch (err: any) {
        console.error("Failed to fetch available orders:", err.message);
        setAvailableOrders([]);
      } finally {
        setIsLoadingOrders(false);
      }
    },
    [],
  );

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
   * Creates a new dispatch plan from validated form data.
   */
  const createPlan = async (values: DispatchPlanFormValues) => {
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  /**
   * Updates an existing dispatch plan.
   */
  const updatePlan = async (
    id: number | string,
    values: DispatchPlanFormValues,
  ) => {
    const response = await fetch(`${API_PATH}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  return {
    // Pending plans
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,

    // Master data
    masterData,

    // Available orders
    availableOrders,
    isLoadingOrders,
    fetchAvailableOrders,

    // Shared
    isLoading,
    error,
    search,
    setSearch,
    refresh,

    // Mutations
    createPlan,
    updatePlan,
    fetchPlanDetails,
  };
}
