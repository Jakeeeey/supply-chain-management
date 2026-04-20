import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanMasterData,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { usePDPFilter } from "../../context/PDPFilterContext";

const API_PATH =
  "/api/scm/warehouse-management/consolidation/pre-dispatch-plan";

/**
 * Hook for the PDP Planner sub-module.
 */
export function usePreDispatchPlanner() {
  const { clusterId, status, search, setSearch, branchId, dateRange } =
    usePDPFilter();

  // ─── Plans State ──────────────────────────────────
  const [plansData, setPlansData] = useState<DispatchPlan[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);

  // ─── Pagination State ─────────────────────────────
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  // ─── Master Data (for filters) ───────────────────
  const [masterData, setMasterData] = useState<DispatchPlanMasterData | null>(
    null,
  );

  // ─── Metrics State ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metrics, setMetrics] = useState<any>(null);

  // ─── Shared State ─────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch master data only if not already loaded.
   */
  const loadMasterData = useCallback(async () => {
    try {
      const res = await fetch(`${API_PATH}?type=master`);
      const result = await res.json();
      if (result.data) setMasterData(result.data);
    } catch (e) {
      console.error("Failed to load master data", e);
    }
  }, []);

  // ─── Fetch All Data ──────────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(pagination.pageSize),
        offset: String(pagination.pageIndex * pagination.pageSize),
        search: search,
      });

      if (clusterId) params.append("cluster_id", String(clusterId));
      if (status) params.append("status", status);
      if (branchId) params.append("branch_id", String(branchId));

      if (dateRange?.from) {
        params.append("start_date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        params.append("end_date", format(dateRange.to, "yyyy-MM-dd"));
      }

      const [plansRes, metricsRes] = await Promise.all([
        fetch(`${API_PATH}?${params.toString()}`).then((r) => r.json()),
        fetch(`${API_PATH}?type=metrics&${params.toString()}`).then((r) =>
          r.json(),
        ),
      ]);

      if (plansRes.error) throw new Error(plansRes.error);
      if (metricsRes.error) throw new Error(metricsRes.error);

      setPlansData(plansRes.data || []);
      setPlansTotal(
        plansRes.meta?.filter_count || plansRes.meta?.total_count || 0,
      );
      setMetrics(metricsRes.data || null);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, clusterId, status, branchId, dateRange, pagination]);

  useEffect(() => {
    const handler = setTimeout(() => {
      refresh();
    }, 300);
    return () => clearTimeout(handler);
  }, [refresh]);

  // Initial load of master data
  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

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
    pagination,
    setPagination,

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
