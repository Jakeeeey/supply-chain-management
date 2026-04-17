"use client";

import { Button } from "@/components/ui/button";
import {
  DispatchPlanSummary,
  DispatchPlanTable,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/components/data-table";
import { DispatchCreationModal } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/components/modals/DispatchCreationModal";
import { DispatchEditModal } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/components/modals/DispatchEditModal";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/hooks/useDispatchCreation";
import { SortingState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export default function DispatchCreationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditPlanId, setSelectedEditPlanId] = useState<number | null>(
    null,
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const { dispatchSummary, isLoadingSummary, refreshSummary } =
    useDispatchCreation();

  const handleEdit = useCallback((plan: DispatchPlanSummary) => {
    setSelectedEditPlanId(Number(plan.id));
    setIsEditModalOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <DispatchPlanTable
          data={dispatchSummary || []}
          isLoading={isLoadingSummary}
          sorting={sorting}
          onSortingChange={setSorting}
          onEdit={handleEdit}
          actionComponent={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" /> Create 
            </Button>
          }
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

      <DispatchEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        planId={selectedEditPlanId}
        onSuccess={() => {
          refreshSummary();
        }}
      />
    </div>
  );
}
