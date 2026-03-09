"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanFormValues,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PDPCreationTable } from "./components/data-table";
import { PDPCreateModal } from "./components/modals/pdp-create-modal";
import { usePreDispatchCreation } from "./hooks/usePreDispatchCreation";

/**
 * Main page for PDP Creation (Pending Plans).
 * Displays a data table of pending dispatch plans
 * and provides "Create PDP" and "Edit" actions.
 */
export default function PDPCreationPage() {
  const {
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    masterData,
    availableOrders,
    isLoadingOrders,
    fetchAvailableOrders,
    isLoading,
    error,
    setSearch,
    refresh,
    createPlan,
    updatePlan,
    fetchPlanDetails,
  } = usePreDispatchCreation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // ─── Edit Mode State ──────────────────────────────
  const [editPlan, setEditPlan] = useState<DispatchPlan | null>(null);
  const [editDetails, setEditDetails] = useState<DispatchPlanDetail[]>([]);
  const [isEditLoading, setIsEditLoading] = useState(false);

  const handleEdit = useCallback(
    async (plan: DispatchPlan) => {
      setIsEditLoading(true);
      try {
        const result = await fetchPlanDetails(plan.dispatch_id);
        setEditPlan(result.plan);
        setEditDetails(result.details);
        setIsCreateOpen(true);
      } catch (err: any) {
        toast.error(err.message || "Failed to load plan details.");
      } finally {
        setIsEditLoading(false);
      }
    },
    [fetchPlanDetails],
  );

  const handleSubmit = async (values: DispatchPlanFormValues) => {
    if (editPlan) {
      // Update existing plan
      await updatePlan(editPlan.dispatch_id, values);
    } else {
      // Create new plan
      await createPlan(values);
    }
  };

  const handleModalClose = () => {
    setIsCreateOpen(false);
    setEditPlan(null);
    setEditDetails([]);
  };

  const handleClusterChange = useCallback(
    (clusterId: number) => {
      fetchAvailableOrders(clusterId);
    },
    [fetchAvailableOrders],
  );

  if (isLoading && !pendingData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      <PDPCreationTable
        data={pendingData}
        totalCount={pendingTotal}
        pageIndex={pendingPage}
        pageSize={pendingLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setPendingPage(p.pageIndex);
          setPendingLimit(p.pageSize);
        }}
        isLoading={isLoading || isEditLoading}
        onEdit={handleEdit}
        onSearch={(v: string) => setSearch(v)}
        actionComponent={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PDP
          </Button>
        }
      />

      {/* Create / Edit Modal */}
      <PDPCreateModal
        open={isCreateOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        masterData={masterData}
        availableOrders={availableOrders}
        isLoadingOrders={isLoadingOrders}
        onClusterChange={handleClusterChange}
        editPlan={editPlan}
        editDetails={editDetails}
      />
    </div>
  );
}
