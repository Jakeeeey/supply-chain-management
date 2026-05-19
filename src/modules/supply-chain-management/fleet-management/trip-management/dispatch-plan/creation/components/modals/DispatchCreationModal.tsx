"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/hooks/useDispatchCreation";
import { useDispatchFormState } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/hooks/useDispatchFormState";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import type { EnrichedPlanDetail } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { DispatchModalSkeleton } from "./DispatchSkeleton";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";
import { DispatchConfirmationModal } from "./parts/DispatchConfirmationModal";

interface DispatchCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DispatchCreationModal({
  open,
  onOpenChange,
  onSuccess,
}: DispatchCreationModalProps) {
  const { masterData, isLoadingMasterData, createTrip, isSubmitting } =
    useDispatchCreation();

  const form = useForm<DispatchCreationFormValues>({
    resolver: zodResolver(DispatchCreationFormSchema),
    defaultValues: {
      pre_dispatch_plan_ids: [],
      starting_point: 0,
      vehicle_id: 0,
      driver_id: 0,
      estimated_time_of_dispatch: "",
      estimated_time_of_arrival: "",
      remarks: "",
      amount: 0,
      helpers: [{ user_id: 0 }],
    },
  });

  useFieldArray({
    control: form.control,
    name: "helpers",
  });

  const {
    approvedPlans,
    filteredPlans,
    readinessFilter,
    setReadinessFilter,
    isLoadingPlans,
    planDetails,
    isLoadingDetails,
    searchQuery,
    hasMore,
    handlePlanSelect,
    onSearchChange,
    onLoadMore,
    setPlanDetails,
    totalWeight,
    vehicleCapacity,
  } = useDispatchFormState({
    form,
    vehicles: masterData?.vehicles,
  });

  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<unknown>(null);

  const selectedBranch = useWatch({
    control: form.control,
    name: "starting_point",
  });

  const selectedPlanIds = useWatch({
    control: form.control,
    name: "pre_dispatch_plan_ids",
  }) || [];

  const amount = useWatch({
    control: form.control,
    name: "amount",
  }) || 0;

  // Reset selected plans when branch changes
  useEffect(() => {
    form.setValue("pre_dispatch_plan_ids", []);
    form.setValue("amount", 0);
    setPlanDetails([]);
  }, [selectedBranch, form, setPlanDetails]);

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        form.reset();
        onSearchChange("");
        setIsConfirming(false);
        setPendingPayload(null);
        setPlanDetails([]);
      }, 0);
    }
  }, [open, form, onSearchChange, setPlanDetails]);



  const onSubmit = async (values: DispatchCreationFormValues) => {
    const payload = {
      ...values,
      invoices: planDetails.map((d: EnrichedPlanDetail, index: number) => ({
        invoice_id: d.invoice_id,
        invoice_ids: d.invoice_ids,
        invoice_no: d.order_no,
        sequence: index + 1,
        remarks: d.remarks,
        distance: d.distance,
        isManualStop: d.isManualStop,
        isPoStop: d.isPoStop,
        po_id: d.po_id,
        po_no: d.po_no,
        status: d.status,
      })),
    };

    setPendingPayload(payload);
    setIsConfirming(true);
  };

  const handleConfirmCreate = async () => {
    if (!pendingPayload) return;
    try {
      await createTrip(pendingPayload as DispatchCreationFormValues);
      toast.success("Dispatch trip created successfully.");
      setIsConfirming(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create dispatch trip");
    }
  };

  const isDataReady = !isLoadingMasterData && masterData;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1400px] h-[80vh] max-h-[80vh] min-h-0 w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-xl flex flex-col justify-start">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/8 border border-border/60 flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                Create Dispatch Trip
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign vehicle, crew, and link a pre-dispatch plan.
              </p>
            </div>
          </div>
        </DialogHeader>

        {!isDataReady ? (
          <DispatchModalSkeleton />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0 m-0"
            >
              <div className="flex divide-x divide-border/50 flex-1 min-h-0">
                <PdpListSidebar
                  approvedPlans={approvedPlans}
                  filteredPlans={filteredPlans}
                  readinessFilter={readinessFilter}
                  onFilterChange={setReadinessFilter}
                  isLoadingPlans={isLoadingPlans}
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                  onLoadMore={onLoadMore}
                  hasMore={hasMore}
                  selectedPlanIds={selectedPlanIds}
                  onPlanSelect={handlePlanSelect}
                  selectedBranch={selectedBranch}
                  currentTotalWeight={totalWeight}
                  vehicleCapacity={vehicleCapacity}
                />

                <TripConfigurationForm 
                  masterData={masterData} 
                  vehicleCapacity={vehicleCapacity}
                />

                <InvoiceItemsSidebar
                  selectedPlanIds={selectedPlanIds}
                  planDetails={planDetails}
                  isLoadingDetails={isLoadingDetails}
                  onReorder={setPlanDetails}
                  selectedAmount={amount}
                  totalWeight={totalWeight}
                  vehicleCapacity={vehicleCapacity}
                  selectedBranch={selectedBranch}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {selectedPlanIds.length > 0 &&
                  planDetails.length > 0 &&
                  planDetails.some(
                    (o) =>
                      !o.isManualStop &&
                      !o.isPoStop &&
                      o.true_order_status !== "For Loading" &&
                      o.true_order_status !== "On Hold",
                  )
                    ? "⚠ Some items are not ready for dispatch (must be For Loading or On Hold)."
                    : selectedPlanIds.length > 0
                      ? "Ready to dispatch — review details before confirming."
                      : "Select a pre-dispatch plan to continue."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8 px-4 text-sm font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isSubmitting ||
                      !selectedPlanIds.length ||
                      planDetails.length === 0 ||
                      planDetails.some(
                        (o) =>
                          !o.isManualStop &&
                          !o.isPoStop &&
                          o.true_order_status !== "For Loading" &&
                          o.true_order_status !== "On Hold",
                      )
                    }
                    className="h-8 px-4 text-sm font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Dispatch"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
        </DialogContent>
      </Dialog>
      {isDataReady && (
        <DispatchConfirmationModal
          open={isConfirming}
          onOpenChange={setIsConfirming}
          onConfirm={handleConfirmCreate}
          isSubmitting={isSubmitting}
          payload={pendingPayload as DispatchCreationFormValues}
          masterData={masterData}
          planDetails={planDetails}
          approvedPlans={approvedPlans}
        />
      )}
    </>
  );
}
