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
import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/services/lifecycle";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DispatchModalSkeleton } from "./DispatchSkeleton";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";
import { PlanDetailItem } from "./parts/types";
import { EnrichedApprovedPlan } from "../../types/dispatch.types";

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

  const [approvedPlans, setApprovedPlans] = useState<EnrichedApprovedPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planDetails, setPlanDetails] = useState<PlanDetailItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [, setPage] = useState(1);
  const [hasMore] = useState(false);

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

  const selectedBranch = form.watch("starting_point");

  const loadApprovedPlans = useCallback(async (
    branchId: number,
    currentPdpIds?: number[],
  ) => {
    setIsLoadingPlans(true);
    try {
      const url = new URL(
        "/api/scm/fleet-management/trip-management/dispatch-plan/creation",
        window.location.origin,
      );
      url.searchParams.append("type", "approved_plans");
      url.searchParams.append("branch_id", String(branchId));
      if (currentPdpIds && currentPdpIds.length > 0) {
        url.searchParams.append("current_plan_id", currentPdpIds.join(","));
      }

      const res = await fetch(url.toString(), { cache: "no-store" });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setApprovedPlans(result.data || []);
    } catch {
      toast.error("Failed to load approved pre-dispatch plans");
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    // Skip during initial load — the fetch effect handles the first call
    if (isInitialLoadRef.current) return;
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch, form.getValues("pre_dispatch_plan_ids"));
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch, loadApprovedPlans, form]);

  const handlePlanSelect = async (pdpIdStr: string) => {
    const selectedPdpId = Number(pdpIdStr);
    const pdp = approvedPlans.find((p) => p.dispatch_id === selectedPdpId);
    if (!pdp) return;

    const currentIds = form.getValues("pre_dispatch_plan_ids") || [];
    const isSelected = currentIds.includes(selectedPdpId);

    let newIds: number[];
    if (isSelected) {
      newIds = currentIds.filter((id) => id !== selectedPdpId);
    } else {
      newIds = [...currentIds, selectedPdpId];
    }

    form.setValue("pre_dispatch_plan_ids", newIds, { shouldValidate: true });

    if (newIds.length > 0) {
      const firstPlan = approvedPlans.find((p) => p.dispatch_id === newIds[0]);
      if (firstPlan && newIds.length === 1) {
        if (firstPlan.driver_id)
          form.setValue("driver_id", Number(firstPlan.driver_id));
        if (firstPlan.vehicle_id)
          form.setValue("vehicle_id", Number(firstPlan.vehicle_id));
        if (firstPlan.branch_id)
          form.setValue("starting_point", Number(firstPlan.branch_id));
      }
    }

    if (newIds.length === 0) {
      setPlanDetails([]);
      return;
    }

    setIsLoadingDetails(true);

    // Save current sequence and manual/PO stops
    const currentSeqMap = new Map();
    planDetails.forEach((d, idx) => {
      if (d.order_no) currentSeqMap.set(d.order_no, idx);
      if (d.isManualStop) currentSeqMap.set(d.detail_id, idx);
      if (d.isPoStop) currentSeqMap.set(d.detail_id, idx);
    });
    
    const retainedStops = planDetails.filter(d => d.isManualStop || d.isPoStop);

    try {
      // Pass planId as trip_id to ensure already-dispatched invoices are included.
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${newIds.join(",")}&trip_id=${planId}`,
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      const fetchedItems = result.data || [];
      // Filter out manual/PO stops from the API response because we already have them in retainedStops
      // (and retainedStops might have unsaved local edits or sequence changes).
      const fetchedInvoices = fetchedItems.filter((i: { isManualStop?: boolean; isPoStop?: boolean }) => !i.isManualStop && !i.isPoStop);
      
      const combined = [...fetchedInvoices, ...retainedStops];
      
      combined.sort((a, b) => {
        const keyA = a.isManualStop || a.isPoStop ? a.detail_id : a.order_no;
        const keyB = b.isManualStop || b.isPoStop ? b.detail_id : b.order_no;
        const seqA = currentSeqMap.has(keyA) ? currentSeqMap.get(keyA) : 9999;
        const seqB = currentSeqMap.has(keyB) ? currentSeqMap.get(keyB) : 9999;
        return seqA - seqB;
      });

      setPlanDetails(combined);
    } catch {
      toast.error("Failed to load plan details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

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
            setIsLoadingDetails(true);
            const detailPlanIds = loadedIds.join(",");
            const detailsRes = await fetch(
              `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${detailPlanIds}&trip_id=${planId}`,
            );
            const detailsResult = await detailsRes.json();
            const loadedDetails: PlanDetailItem[] = detailsResult.data || [];
            setPlanDetails(loadedDetails);
            setIsLoadingDetails(false);

            // Recalculate amount as SUM of sales invoice amounts
            const totalAmount = loadedDetails.reduce(
              (sum, d) => sum + (d.amount || 0),
              0,
            );
            form.setValue("amount", totalAmount);

            // Manually load approved plans (including the Dispatched ones)
            // so the left sidebar highlights the linked PDPs
            await loadApprovedPlans(branchId, loadedIds);
          }
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Could not load plan details");
        } finally {
          setIsLoading(false);
          // Allow the branch-change effect to work again after initial load
          // Use a longer delay to ensure React has flushed all batched renders
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
  }, [open, planId, form, loadApprovedPlans]);

  /** Synch form amount with actual planDetails (invoices) sum */
  useEffect(() => {
    const total = planDetails.reduce((sum, d) => sum + (d.amount || 0), 0);
    form.setValue("amount", total);
  }, [planDetails, form]);

  /** Calculate total weight of selected items */
  const totalWeight = useMemo(() => {
    return planDetails.reduce((sum, d) => sum + (d.weight || 0), 0);
  }, [planDetails]);

  /** Find selected vehicle and its capacity */
  const selectedVehicleId = form.watch("vehicle_id");
  const vehicleCapacity = useMemo(() => {
    if (!masterData?.vehicles || !selectedVehicleId) return 0;
    const v = masterData.vehicles.find((v) => v.vehicle_id === selectedVehicleId);
    return Number(v?.maximum_weight || 0);
  }, [masterData, selectedVehicleId]);

  const onSubmit = async (values: DispatchCreationFormValues) => {
    if (!planId) return;

    const payload = {
      ...values,
      invoices: planDetails.map((details: PlanDetailItem, index: number) => ({
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
                  onSearchChange={(val) => {
                    setSearchQuery(val);
                    setPage(1);
                  }}
                  onLoadMore={() => setPage(p => p + 1)}
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
