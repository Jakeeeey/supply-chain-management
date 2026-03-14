import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanFormValues,
  DispatchPlanMasterData,
  SalesOrderOption,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useEffect, useState } from "react";
import { usePDPFilter } from "../../context/PDPFilterContext";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Creation sub-module.
 */
export function usePreDispatchCreation() {
  const { clusterId, setClusterId, search, setSearch } = usePDPFilter();

  // ─── Pending Plans State ──────────────────────────
  const [pendingData, setPendingData] = useState<DispatchPlan[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);

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

  // ─── Fetch Master Data ────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchMaster = async () => {
      try {
        const res = await fetch(`${API_PATH}?type=master`);
        const result = await res.json();
        if (isMounted) setMasterData(result.data || null);
      } catch (err: any) {
        console.error("Failed to fetch master data:", err.message);
      }
    };
    fetchMaster();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Fetch Pending Plans ──────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: "Pending",
        limit: "-1",
      });

      if (search) params.append("search", search);
      if (clusterId) params.append("cluster_id", String(clusterId));

      const res = await fetch(`${API_PATH}?${params.toString()}`);
      const plansRes = await res.json();

      if (plansRes.error) throw new Error(plansRes.error);

      setPendingData(plansRes.data || []);
      setPendingTotal(
        plansRes.meta?.filter_count || plansRes.meta?.total_count || plansRes.data?.length || 0,
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, clusterId]);

  useEffect(() => {
    // Debounce the refresh call to avoid rapid refetching
    const handler = setTimeout(() => {
      refresh();
    }, 300);
    return () => clearTimeout(handler);
  }, [refresh]);

  // ─── Fetch Available Orders by Cluster ────────────
  const fetchAvailableOrders = useCallback(
    async (
      targetClusterId?: number,
      orderSearch?: string,
      targetBranchId?: number,
    ) => {
      setIsLoadingOrders(true);
      try {
        const params = new URLSearchParams({ type: "available_orders" });
        // Use the passed ids or the global filter ids
        const activeClusterId = targetClusterId || clusterId;
        if (activeClusterId) params.set("cluster_id", String(activeClusterId));
        if (targetBranchId) params.set("branch_id", String(targetBranchId));
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
    [clusterId],
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
