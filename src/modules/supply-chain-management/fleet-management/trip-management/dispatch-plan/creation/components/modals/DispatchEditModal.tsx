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
import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/services/lifecycle";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import type { EnrichedPlanDetail } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { DispatchModalSkeleton } from "./DispatchSkeleton";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";

interface DispatchEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number | null;
  onSuccess: () => void;
}

export function DispatchEditModal({
  open,
  onOpenChange,
  planId,
  onSuccess,
}: DispatchEditModalProps) {
  const { masterData, refreshMasterData, isLoadingMasterData } =
    useDispatchCreation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialLoadRef = useRef(false);

  useEffect(() => {
    if (open && !masterData) {
      refreshMasterData();
    }
  }, [open, masterData, refreshMasterData]);

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

  const {
    approvedPlans,
    isLoadingPlans,
    planDetails,
    isLoadingDetails,
    searchQuery,
    hasMore,
    handlePlanSelect,
    onSearchChange,
    onLoadMore,
    setPlanDetails,
    setApprovedPlans,
    loadApprovedPlans,
    totalWeight,
    vehicleCapacity,
  } = useDispatchFormState({
    form,
    tripId: planId,
    vehicles: masterData?.vehicles,
  });

  const selectedBranch = useWatch({
    control: form.control,
    name: "starting_point",
  });

  // Reload approved plans when branch changes (skip during initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch, 1, "", false, form.getValues("pre_dispatch_plan_ids"));
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch, loadApprovedPlans, form, setApprovedPlans]);

  // Load existing plan data when modal opens
  useEffect(() => {
    if (open && planId) {
      const fetchDetails = async () => {
        isInitialLoadRef.current = true;
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=post_plan_details&plan_id=${planId}`,
          );
          if (!res.ok) throw new Error("Failed to load details");
          const result = await res.json();
          const p = result.data;
          const loadedIds = p.dispatch_ids?.length
            ? p.dispatch_ids.map(Number)
            : p.dispatch_id
              ? [Number(p.dispatch_id)]
              : [];
          const branchId = p.starting_point || 0;

          form.reset({
            pre_dispatch_plan_ids: loadedIds,
            starting_point: branchId,
            vehicle_id: p.vehicle_id || 0,
            driver_id: p.driver_id || 0,
            estimated_time_of_dispatch: p.estimated_time_of_dispatch || "",
            estimated_time_of_arrival: p.estimated_time_of_arrival || "",
            remarks: p.remarks || "",
            amount: p.amount || 0,
            helpers: p.helpers?.length ? p.helpers : [{ user_id: 0 }],
          });

          if (loadedIds.length > 0) {
            // Fetch plan details (sales invoices) for the right sidebar
            const detailPlanIds = loadedIds.join(",");
            const detailsRes = await fetch(
              `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${detailPlanIds}&trip_id=${planId}`,
            );
            const detailsResult = await detailsRes.json();
            const loadedDetails: EnrichedPlanDetail[] = detailsResult.data || [];
            setPlanDetails(loadedDetails);

            // Recalculate amount as SUM of sales invoice amounts
            const totalAmount = loadedDetails.reduce(
              (sum, d) => sum + (d.amount || 0),
              0,
            );
            form.setValue("amount", totalAmount);

            // Load approved plans (including the Dispatched ones)
            await loadApprovedPlans(branchId, 1, "", false, loadedIds);
          }
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Could not load plan details");
        } finally {
          setIsLoading(false);
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 500);
        }
      };
      fetchDetails();
    } else {
      form.reset();
      setPlanDetails([]);
      setApprovedPlans([]);
    }
  }, [open, planId, form, loadApprovedPlans, setPlanDetails, setApprovedPlans]);

  const onSubmit = async (values: DispatchCreationFormValues) => {
    if (!planId) return;

    const payload = {
      ...values,
      invoices: planDetails.map((details: EnrichedPlanDetail, index: number) => ({
        invoice_id: details.invoice_id,
        invoice_ids: details.invoice_ids,
        invoice_no: details.order_no,
        sequence: index + 1,
        remarks: details.remarks,
        distance: details.distance,
        isManualStop: details.isManualStop,
        isPoStop: details.isPoStop,
        po_id: details.po_id,
        po_no: details.po_no,
        status: details.status,
      })),
    };

    try {
      setIsSaving(true);
      await dispatchCreationLifecycleService.updateTrip(planId, payload);
      toast.success("Dispatch trip updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update dispatch trip");
    } finally {
      setIsSaving(false);
    }
  };

  const isDataReady = !isLoadingMasterData && masterData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] h-[80vh] max-h-[80vh] min-h-0 w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-xl flex flex-col justify-start">
        <DialogHeader className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/8 border border-border/60 flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                Edit Dispatch Trip
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update vehicle, crew, or reorder linked sales invoices.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading || !isDataReady ? (
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
                  isLoadingPlans={isLoadingPlans}
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                  onLoadMore={onLoadMore}
                  hasMore={hasMore}
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids") || []}
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
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids") || []}
                  planDetails={planDetails}
                  isLoadingDetails={isLoadingDetails}
                  onReorder={setPlanDetails}
                  selectedAmount={form.watch("amount") || 0}
                  totalWeight={totalWeight}
                  vehicleCapacity={vehicleCapacity}
                  selectedBranch={selectedBranch}
                />
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {form.watch("pre_dispatch_plan_ids")?.length > 0
                    ? "Adjust details and reorder invoices if needed before saving."
                    : "Review and update dispatch trip details."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8 px-4 text-sm font-medium"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="h-8 px-4 text-sm font-medium"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
