import { useCallback, useEffect, useState } from "react";
import { DispatchPlanSummary } from "../../creation/components/data-table/index";

export function useDispatchBudgeting() {
  const [masterData, setMasterData] = useState<any>(null);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  const [dispatchSummary, setDispatchSummary] = useState<DispatchPlanSummary[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMasterData = useCallback(async () => {
    setIsLoadingMasterData(true);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=master",
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setMasterData(result.data);
    } catch (err: any) {
      console.error("Failed to load master data:", err.message);
    } finally {
      setIsLoadingMasterData(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-plan/budgeting/summary",
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      const rawData = result.data || [];

      try {
        const budgetRes = await fetch(
          "/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=budget_summary",
        );
        const budgetResult = await budgetRes.json();
        const budgets = budgetResult.data || [];

        const budgetMap = new Map<string, number>();
        budgets.forEach((b: any) => {
          const pid = String(b.post_dispatch_plan_id);
          budgetMap.set(pid, (budgetMap.get(pid) || 0) + Number(b.amount || 0));
        });

        const enriched = rawData.map((p: any) => {
          const totalValue = (p.customerTransactions || []).reduce(
            (acc: number, t: any) => acc + Number(t.amount || 0),
            0,
          );
          return {
            ...p,
            amount: totalValue,
            budgetTotal: budgetMap.get(String(p.id)) || 0,
          };
        });

        setDispatchSummary(enriched);
      } catch (budgetErr) {
        setDispatchSummary(rawData);
      }
    } catch (err: any) {
      console.error("Failed to load dispatch summary:", err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
    fetchSummary();
  }, [fetchMasterData, fetchSummary]);

  const updateBudget = async (
    planId: number,
    budgets: { coa_id: number; amount: number; remarks?: string }[],
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/budgeting?plan_id=${planId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgets }),
        },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update budget");

      await fetchSummary();
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPlanBudgets = async (planId: number) => {
    const res = await fetch(
      `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_budgets&plan_id=${planId}`
    );
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result.data || [];
  };

  return {
    masterData,
    isLoadingMasterData,
    dispatchSummary,
    isLoadingSummary,
    refreshSummary: fetchSummary,
    updateBudget,
    isSubmitting,
    fetchPlanBudgets,
  };
}
