import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanMasterData,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useEffect, useState } from "react";
import { usePDPFilter } from "../../context/PDPFilterContext";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Planner sub-module.
 */
export function usePreDispatchPlanner() {
  const { clusterId, status, search, setSearch } = usePDPFilter();

  // ─── Plans State ──────────────────────────────────
  const [plansData, setPlansData] = useState<DispatchPlan[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(0);
  const [plansLimit, setPlansLimit] = useState(10);

  // ─── Master Data (for filters) ───────────────────
  const [masterData, setMasterData] = useState<DispatchPlanMasterData | null>(
    null,
  );

  // ─── Metrics State ────────────────────────────────
  const [metrics, setMetrics] = useState<any>(null);

  // ─── Shared State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch All Data ──────────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(plansLimit),
        offset: String(plansPage * plansLimit),
        search: search,
      });

      if (clusterId) params.append("cluster_id", String(clusterId));
      if (status) params.append("status", status);

      const [plansRes, masterRes, metricsRes] = await Promise.all([
        fetch(`${API_PATH}?${params.toString()}`).then((r) => r.json()),
        fetch(`${API_PATH}?type=master`).then((r) => r.json()),
        fetch(
          `${API_PATH}?type=metrics${clusterId ? `&cluster_id=${clusterId}` : ""}`,
        ).then((r) => r.json()),
      ]);

      if (plansRes.error) throw new Error(plansRes.error);
      if (masterRes.error) throw new Error(masterRes.error);
      if (metricsRes.error) throw new Error(metricsRes.error);

      setPlansData(plansRes.data || []);
      setPlansTotal(
        plansRes.meta?.filter_count || plansRes.meta?.total_count || 0,
      );
      setMasterData(masterRes.data || null);
      setMetrics(metricsRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [plansLimit, plansPage, search, clusterId, status]);

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
    plansData,
    plansTotal,
    plansPage,
    setPlansPage,
    plansLimit,
    setPlansLimit,

    masterData,
    metrics,

    isLoading,
    error,
    search,
    setSearch,
    refresh,

    fetchPlanDetails,
    approvePlan,
  };
}
