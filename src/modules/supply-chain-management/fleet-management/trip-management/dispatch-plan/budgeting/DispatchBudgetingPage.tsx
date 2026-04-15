"use client";

import { useState } from "react";
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
  } = useDispatchBudgeting();

  const [selectedPlanOverride, setSelectedPlanOverride] = useState<DispatchPlanSummary | null>(null);

  const selectedPlan = selectedPlanOverride || (dispatchSummary.length > 0 ? dispatchSummary[0] : null);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden border border-border/60 rounded-xl bg-background shadow-sm">
        <DispatchListSidebar
          plans={dispatchSummary}
          isLoading={isLoadingSummary}
          selectedPlanId={selectedPlan?.id}
          onSelectPlan={setSelectedPlanOverride}
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
        />
      </div>
    </div>
  );
}
