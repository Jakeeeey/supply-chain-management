"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PDPPlannerTable } from "./components/data-table";
import { PDPApproveModal } from "./components/modals/pdp-approve-modal";
import { PDPViewModal } from "./components/modals/pdp-view-modal";
import { PDPGlobalFilter } from "./components/PDPGlobalFilter";
import { PDPMetrics } from "./components/PDPMetrics";
import { usePreDispatchPlanner } from "./hooks/usePreDispatchPlanner";

/**
 * Main page for PDP Planner.
 */
export default function PDPPlannerPage() {
  const {
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
    setSearch,
    refresh,
    fetchPlanDetails,
    approvePlan,
  } = usePreDispatchPlanner();

  const [selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);
  const [approvingPlan, setApprovingPlan] = useState<DispatchPlan | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const handleView = useCallback((plan: DispatchPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handleApproveClick = useCallback((plan: DispatchPlan) => {
    setApprovingPlan(plan);
  }, []);

  const handleApproveConfirm = async () => {
    if (!approvingPlan) return;
    setIsApproving(true);
    try {
      await approvePlan(approvingPlan.dispatch_id);
      toast.success(`${approvingPlan.dispatch_no} approved successfully!`);
      setApprovingPlan(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve plan.");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading && !plansData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-0">
      <PDPMetrics metrics={metrics} />

      <PDPGlobalFilter masterData={masterData} />

      <PDPPlannerTable
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
        onApprove={handleApproveClick}
        onSearch={(v: string) => setSearch(v)}
      />

      {/* View Modal */}
      <PDPViewModal
        open={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        plan={selectedPlan}
        fetchDetails={fetchPlanDetails}
      />

      {/* Approve Confirmation Modal */}
      <PDPApproveModal
        open={approvingPlan !== null}
        onClose={() => setApprovingPlan(null)}
        plan={approvingPlan}
        onConfirm={handleApproveConfirm}
        isLoading={isApproving}
      />
    </div>
  );
}
