"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/new-data-table";
import {
  DispatchPlanSummary,
  getDispatchPlanColumns,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/components/data-table/DispatchPlanColumns";
import { BudgetAllocationModal } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/components/modals/BudgetAllocationModal";
import { DispatchCreationModal } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/components/modals/DispatchCreationModal";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/hooks/useDispatchCreation";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export default function DispatchCreationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DispatchPlanSummary | null>(
    null,
  );

  const { dispatchSummary, isLoadingSummary, refreshSummary, masterData } =
    useDispatchCreation();

  const columns = useMemo(
    () =>
      getDispatchPlanColumns(
        (plan) => {
          console.log("Edit plan:", plan);
          // TODO: Implement edit logic if needed
        },
        (plan) => {
          setSelectedPlan(plan);
          setIsBudgetModalOpen(true);
        },
      ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dispatch Plan Masterlist
          </h1>
          <p className="text-muted-foreground">
            Manage and create Post-Dispatch Trips, assign crews, and allocate
            budgets.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700  px-6"
        >
          <Plus className="w-4 h-4" /> Create Dispatch Plan
        </Button>
      </div>

      <div className="flex flex-col space-y-4">
        <DataTable
          columns={columns}
          data={dispatchSummary || []}
          isLoading={isLoadingSummary}
          searchKey="dpNumber"
          emptyTitle="No Dispatch Plans Found"
          emptyDescription="Click 'Create Dispatch' to convert an approved Pre-Dispatch Plan into an active trip."
        />
      </div>

      <DispatchCreationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={() => {
          refreshSummary();
          console.log("Trip creation successful and modal closed");
        }}
      />

      <BudgetAllocationModal
        open={isBudgetModalOpen}
        onOpenChange={setIsBudgetModalOpen}
        plan={selectedPlan}
        coaOptions={masterData?.coa || []}
        onSuccess={() => {
          refreshSummary();
        }}
      />
    </div>
  );
}
