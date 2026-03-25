"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/hooks/useDispatchCreation";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PlanDetailItem } from "./parts/types";


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
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planDetails, setPlanDetails] = useState<PlanDetailItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);



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
    fields: helperFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "helpers",
  });

  const selectedBranch = form.watch("starting_point");

  useEffect(() => {
    if (open) {
      form.reset();
      setApprovedPlans([]);
      setSearchQuery("");
    }
  }, [open, form]);

  // Load plans when branch changes
  useEffect(() => {
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch);
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch]);

  const loadApprovedPlans = async (branchId: number) => {
    setIsLoadingPlans(true);
    setApprovedPlans([]);
    // Clear any previously selected plan
    form.setValue("pre_dispatch_plan_ids", []);
    form.setValue("amount", 0);
    setPlanDetails([]);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=approved_plans&branch_id=${branchId}`,
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setApprovedPlans(result.data || []);
    } catch {
      toast.error("Failed to load approved pre-dispatch plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handlePlanSelect = async (planIdStr: string) => {
    const planId = Number(planIdStr);
    const plan = approvedPlans.find((p) => p.dispatch_id === planId);
    if (!plan) return;

    const currentIds = form.getValues("pre_dispatch_plan_ids") || [];
    const isSelected = currentIds.includes(planId);
    
    let newIds: number[];
    if (isSelected) {
      newIds = currentIds.filter(id => id !== planId);
    } else {
      newIds = [...currentIds, planId];
    }
    
    form.setValue("pre_dispatch_plan_ids", newIds, { shouldValidate: true });

    // Recalculate amount
    const totalAmount = approvedPlans
      .filter((p) => newIds.includes(p.dispatch_id))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);
    form.setValue("amount", totalAmount);

    // Initial inheritance mapping (from the first selected plan, if any)
    if (newIds.length > 0) {
      const firstPlan = approvedPlans.find((p) => p.dispatch_id === newIds[0]);
      if (firstPlan && newIds.length === 1) {
        // Only override on the first selection to avoid wiping out user changes
        if (firstPlan.driver_id) form.setValue("driver_id", Number(firstPlan.driver_id));
        if (firstPlan.vehicle_id) form.setValue("vehicle_id", Number(firstPlan.vehicle_id));
        if (firstPlan.branch_id) form.setValue("starting_point", Number(firstPlan.branch_id));
      }
    }

    if (newIds.length === 0) {
      setPlanDetails([]);
      return;
    }

    // Fetch plan details (sales orders) for all combined plans
    setIsLoadingDetails(true);
    setPlanDetails([]);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${newIds.join(",")}`,
        { cache: "no-store" },
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setPlanDetails(result.data || []);
    } catch {
      toast.error("Failed to load plan details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const onSubmit = async (values: DispatchCreationFormValues) => {
    try {
      await createTrip(values);
      toast.success("Dispatch trip created successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create dispatch trip");
    }
  };

  const isDataReady = !isLoadingMasterData && masterData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-xl">
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
          <div className="p-6 space-y-4">
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex divide-x divide-border/50 max-h-[70vh]">
                <PdpListSidebar
                  approvedPlans={approvedPlans}
                  isLoadingPlans={isLoadingPlans}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids")}
                  onPlanSelect={handlePlanSelect}
                  selectedBranch={selectedBranch}
                  selectedAmount={form.watch("amount")}
                />

                <TripConfigurationForm masterData={masterData} />

                <InvoiceItemsSidebar
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids")}
                  planDetails={planDetails}
                  isLoadingDetails={isLoadingDetails}
                  onReorder={setPlanDetails}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {form.watch("pre_dispatch_plan_ids")?.length > 0 &&
                  planDetails.length > 0 &&
                  planDetails.some(
                    (o) =>
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
  );
}
