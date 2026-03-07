"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PDPApprovalTable } from "./components/data-table";
import { PDPApproveModal } from "./components/modals/pdp-approve-modal";
import { usePreDispatchApproval } from "./hooks/usePreDispatchApproval";

/**
 * Main page for PDP Approval.
 * Displays pending dispatch plans with an Approve action.
 */
export default function PDPApprovalPage() {
  const {
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    isLoading,
    error,
    setSearch,
    refresh,
    approvePlan,
  } = usePreDispatchApproval();

  const [selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const handleView = useCallback((plan: DispatchPlan) => {
    // For now, just show the plan info in the console
    // Could open a view modal in the future
    setSelectedPlan(plan);
  }, []);

  const handleApproveClick = useCallback((plan: DispatchPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handleApproveConfirm = async () => {
    if (!selectedPlan) return;
    setIsApproving(true);
    try {
      await approvePlan(selectedPlan.dispatch_id);
      toast.success(`${selectedPlan.dispatch_no} approved successfully!`);
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve plan.");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading && !pendingData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      <PDPApprovalTable
        data={pendingData}
        totalCount={pendingTotal}
        pageIndex={pendingPage}
        pageSize={pendingLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setPendingPage(p.pageIndex);
          setPendingLimit(p.pageSize);
        }}
        isLoading={isLoading}
        onView={handleView}
        onApprove={handleApproveClick}
        onSearch={(v: string) => setSearch(v)}
      />

      {/* Approve Confirmation Modal */}
      <PDPApproveModal
        open={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        plan={selectedPlan}
        onConfirm={handleApproveConfirm}
        isLoading={isApproving}
      />
    </div>
  );
}
