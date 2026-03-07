"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useState } from "react";
import { PDPMasterlistTable } from "./components/data-table";
import { PDPViewModal } from "./components/modals/pdp-view-modal";
import { usePreDispatchMasterlist } from "./hooks/usePreDispatchMasterlist";

/**
 * Main page for PDP Masterlist.
 * Displays all dispatch plans across all statuses with a view action.
 */
export default function PDPMasterlistPage() {
  const {
    plansData,
    plansTotal,
    plansPage,
    setPlansPage,
    plansLimit,
    setPlansLimit,
    isLoading,
    error,
    setSearch,
    refresh,
    fetchPlanDetails,
  } = usePreDispatchMasterlist();

  const [selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);

  const handleView = useCallback((plan: DispatchPlan) => {
    setSelectedPlan(plan);
  }, []);

  if (isLoading && !plansData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      <PDPMasterlistTable
        data={plansData}
        totalCount={plansTotal}
        pageIndex={plansPage}
        pageSize={plansLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setPlansPage(p.pageIndex);
          setPlansLimit(p.pageSize);
        }}
        isLoading={isLoading}
        onView={handleView}
        onSearch={(v: string) => setSearch(v)}
      />

      {/* View Modal */}
      <PDPViewModal
        open={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        plan={selectedPlan}
        fetchDetails={fetchPlanDetails}
      />
    </div>
  );
}
