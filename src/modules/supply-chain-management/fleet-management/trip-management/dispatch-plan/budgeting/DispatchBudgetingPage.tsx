"use client";

import { useEffect, useState } from "react";
import { DispatchPlanSummary } from "../creation/components/data-table/index";
import { BudgetAllocationPanel } from "./components/BudgetAllocationPanel";
import { DispatchListSidebar } from "./components/DispatchListSidebar";
import { useDispatchBudgeting } from "./hooks/useDispatchBudgeting";

export default function DispatchBudgetingPage() {
  const {
    masterData,
    dispatchSummary,
    isLoadingSummary,
    updateBudget,
    isSubmitting,
    fetchPlanBudgets,
    refreshSummary,
  } = useDispatchBudgeting();

  const [selectedPlan, setSelectedPlan] = useState<DispatchPlanSummary | null>(
    null,
  );

  // Auto-select first plan on load
  useEffect(() => {
    if (dispatchSummary.length > 0 && !selectedPlan) {
      setSelectedPlan(dispatchSummary[0]);
    }
  }, [dispatchSummary, selectedPlan]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden border border-border/60 rounded-xl bg-background shadow-sm">
        <DispatchListSidebar
          plans={dispatchSummary}
          isLoading={isLoadingSummary}
          selectedPlanId={selectedPlan?.id}
          onSelectPlan={setSelectedPlan}
        />
        <BudgetAllocationPanel
          plan={selectedPlan}
          coaOptions={masterData?.coa || []}
          onSave={async (budgets) => {
            if (!selectedPlan) return;
            await updateBudget(Number(selectedPlan.id), budgets);
          }}
          isSubmitting={isSubmitting}
          fetchPlanBudgets={fetchPlanBudgets}
          onClearSelection={() => setSelectedPlan(null)}
        />
      </div>
    </div>
  );
}
