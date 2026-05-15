import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/services";
import {
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import {
  DispatchCreationMasterData,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.types";
import type { DispatchPlanSummary } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/components/data-table";
import { useCallback, useEffect, useState } from "react";

/**
 * Composer hook for the Dispatch Creation module.
 * Manages master data, summary table, and trip creation/submission.
 * Sidebar state (PDP list, plan details) is managed by useDispatchFormState.
 */
export function useDispatchCreation() {
  // ── Master Data ───────────────────────────────────────────
  const [masterData, setMasterData] =
    useState<DispatchCreationMasterData | null>(null);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  const [errorMasterData, setErrorMasterData] = useState<string | null>(null);

  const fetchMasterData = useCallback(async () => {
    setIsLoadingMasterData(true);
    setErrorMasterData(null);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=master",
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setMasterData(result.data);
    } catch (err: unknown) {
      setErrorMasterData(err instanceof Error ? err.message : "Failed to load master data");
    } finally {
      setIsLoadingMasterData(false);
    }
  }, []);

  // ── Summary Table ─────────────────────────────────────────
  const [dispatchSummary, setDispatchSummary] = useState<DispatchPlanSummary[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-plan/creation/summary",
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      const rawData: DispatchPlanSummary[] = result.data || [];

      // Enrich with budget totals
      try {
        const budgetRes = await fetch(
          "/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=budget_summary",
        );
        const budgetResult = await budgetRes.json();
        const budgets: { post_dispatch_plan_id: number; amount: number }[] = budgetResult.data || [];

        const budgetMap = new Map<string, number>();
        budgets.forEach((b) => {
          const pid = String(b.post_dispatch_plan_id);
          budgetMap.set(pid, (budgetMap.get(pid) || 0) + Number(b.amount || 0));
        });

        const enriched: DispatchPlanSummary[] = rawData.map((p) => {
          const customerTransactions = (p.customerTransactions || []) as { amount?: number | string }[];
          const totalValue = customerTransactions.reduce(
            (acc: number, t) => acc + Number(t.amount || 0),
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
        console.error("Failed to enrich budget data:", budgetErr);
        setDispatchSummary(rawData);
      }
    } catch (err: unknown) {
      console.error("Failed to load dispatch summary:", err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // ── Initial Load ──────────────────────────────────────────
  useEffect(() => {
    fetchMasterData();
    fetchSummary();
  }, [fetchMasterData, fetchSummary]);

  // ── Trip Creation ─────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createTrip = async (values: DispatchCreationFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await dispatchCreationLifecycleService.createTrip(values);
      fetchSummary();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred during trip creation.",
      );
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    masterData,
    isLoadingMasterData,
    errorMasterData,

    dispatchSummary,
    isLoadingSummary,
    refreshSummary: fetchSummary,

    createTrip,
    isSubmitting,
    submitError,

    refreshMasterData: fetchMasterData,
  };
}
