"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to approve plan.");
    } finally {
      setIsApproving(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-0">
      <PDPMetrics metrics={metrics} />

      <PDPGlobalFilter masterData={masterData} />

      <PDPPlannerTable
        data={plansData}
        totalCount={plansTotal}
        isLoading={isLoading}
        onView={handleView}
        onApprove={handleApproveClick}
        onSearch={(v: string) => setSearch(v)}
        actionComponent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
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
        fetchDetails={fetchPlanDetails}
      />
    </div>
  );
}
