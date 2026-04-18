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
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DispatchModalSkeleton } from "./DispatchSkeleton";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";
import { PlanDetailItem } from "./parts/types";
import { DispatchConfirmationModal } from "./parts/DispatchConfirmationModal";
import { EnrichedApprovedPlan } from "../../types/dispatch.types";

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
  const [approvedPlans, setApprovedPlans] = useState<EnrichedApprovedPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [planDetails, setPlanDetails] = useState<PlanDetailItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<unknown>(null);

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

  const selectedBranch = form.watch("starting_point");

  // Reset selected plans when branch changes
  useEffect(() => {
    form.setValue("pre_dispatch_plan_ids", []);
    form.setValue("amount", 0);
    setPlanDetails([]);
  }, [selectedBranch, form]);

  useEffect(() => {
    if (open) {
      form.reset();
      setApprovedPlans([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setPage(1);
      setHasMore(true);
      setIsConfirming(false);
      setPendingPayload(null);
      setPlanDetails([]);
    }
  }, [open, form]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadApprovedPlans = useCallback(async (branchId: number, currentPage: number, currentSearch: string, isLoadMore = false) => {
    setIsLoadingPlans(true);
    if (!isLoadMore) {
        setApprovedPlans([]);
    }
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=approved_plans&branch_id=${branchId}&limit=25&offset=${(currentPage - 1) * 25}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`,
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      const newPlans = result.data || [];
      if (newPlans.length < 25) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setApprovedPlans(prev => isLoadMore ? [...prev, ...newPlans] : newPlans);
    } catch {
      toast.error("Failed to load approved pre-dispatch plans");
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  // Load plans when branch, search, or page changes
  useEffect(() => {
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch, page, debouncedSearch, page > 1);
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch, page, debouncedSearch, loadApprovedPlans]);

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

    // Initial inheritance mapping (from the first selected plan, if any)
    if (newIds.length > 0) {
      const firstPlan = approvedPlans.find((p) => p.dispatch_id === newIds[0]);
      if (firstPlan && newIds.length === 1) {
        // Only override on the first selection if the user hasn't picked one yet
        if (firstPlan.driver_id && !form.getValues("driver_id"))
          form.setValue("driver_id", Number(firstPlan.driver_id));
        if (firstPlan.vehicle_id && !form.getValues("vehicle_id"))
          form.setValue("vehicle_id", Number(firstPlan.vehicle_id));
        if (firstPlan.branch_id && !form.getValues("starting_point"))
          form.setValue("starting_point", Number(firstPlan.branch_id));
      }
    }

    // Save current sequence and manual/PO stops to prevent them from vanishing
    const currentSeqMap = new Map();
    planDetails.forEach((d, idx) => {
      if (d.order_no) currentSeqMap.set(d.order_no, idx);
      if (d.isManualStop) currentSeqMap.set(d.detail_id, idx);
      if (d.isPoStop) currentSeqMap.set(d.detail_id, idx);
    });
    
    const retainedStops = planDetails.filter(d => d.isManualStop || d.isPoStop);

    if (newIds.length === 0) {
      setPlanDetails(retainedStops);
      return;
    }

    // Fetch plan details (sales orders) for all combined plans
    setIsLoadingDetails(true);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${newIds.join(",")}`,
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      const fetchedInvoices = result.data || [];
      const combined = [...fetchedInvoices, ...retainedStops];

      // Restore sequence for existing items
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

  /** Sync form amount with actual planDetails (invoices) sum */
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
    // Map the current visual order of invoices (from planDetails state) 
    // to the payload so the backend can save the correct sequence.
    const payload = {
      ...values,
      invoices: planDetails.map((d, index) => ({
        invoice_id: d.invoice_id,
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

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {form.watch("pre_dispatch_plan_ids")?.length > 0 &&
                  planDetails.length > 0 &&
                  planDetails.some(
                    (o) =>
                      !o.isManualStop &&
                      !o.isPoStop &&
                      o.true_order_status !== "For Loading" &&
                      o.true_order_status !== "On Hold",
                  )
                    ? "⚠ Some items are not ready for dispatch (must be For Loading or On Hold)."
                    : form.watch("pre_dispatch_plan_ids")?.length > 0
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
                      !form.watch("pre_dispatch_plan_ids")?.length ||
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
