"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import {
  DispatchPlan,
  DispatchPlanFormValues,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { PDPCreationTable } from "./components/data-table";
import { PDPCreateModal } from "./components/modals/pdp-create-modal";
import { usePreDispatchCreation } from "./hooks/usePreDispatchCreation";

/**
 * Main page for PDP Creation (Pending Plans).
 * Displays a data table of pending dispatch plans
 * and provides a "Create PDP" action to open the creation modal.
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
  } = usePreDispatchCreation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [_selectedPlan, setSelectedPlan] = useState<DispatchPlan | null>(null);

  const handleView = useCallback((plan: DispatchPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handleCreate = async (values: DispatchPlanFormValues) => {
    await createPlan(values);
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
        isLoading={isLoading}
        onView={handleView}
        onSearch={(v: string) => setSearch(v)}
        actionComponent={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PDP
          </Button>
        }
      />

      {/* Create Modal */}
      <PDPCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        masterData={masterData}
        availableOrders={availableOrders}
        isLoadingOrders={isLoadingOrders}
        onClusterChange={handleClusterChange}
      />
    </div>
  );
}
