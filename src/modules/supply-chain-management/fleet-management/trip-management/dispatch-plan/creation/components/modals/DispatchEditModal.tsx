"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
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
import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/services/lifecycle";
import { PdpListSidebar } from "./parts/PdpListSidebar";
import { TripConfigurationForm } from "./parts/TripConfigurationForm";
import { InvoiceItemsSidebar } from "./parts/InvoiceItemsSidebar";
import { PlanDetailItem } from "./parts/types";

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
  const { masterData, refreshMasterData, isLoadingMasterData } = useDispatchCreation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planDetails, setPlanDetails] = useState<PlanDetailItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
  const selectedPlanIds = form.watch("pre_dispatch_plan_ids");

  useEffect(() => {
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch, selectedPlanIds?.[0]);
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch, selectedPlanIds]);

  const loadApprovedPlans = async (branchId: number, currentPdpId?: number) => {
    setIsLoadingPlans(true);
    try {
      const url = new URL(
        "/api/scm/fleet-management/trip-management/dispatch-plan/creation",
        window.location.origin
      );
      url.searchParams.append("type", "approved_plans");
      url.searchParams.append("branch_id", String(branchId));
      if (currentPdpId) {
        url.searchParams.append("current_plan_id", String(currentPdpId));
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

    const totalAmount = approvedPlans
      .filter((p) => newIds.includes(p.dispatch_id))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);
    form.setValue("amount", totalAmount);

    if (newIds.length > 0) {
      const firstPlan = approvedPlans.find((p) => p.dispatch_id === newIds[0]);
      if (firstPlan && newIds.length === 1) {
        if (firstPlan.driver_id) form.setValue("driver_id", Number(firstPlan.driver_id));
        if (firstPlan.vehicle_id) form.setValue("vehicle_id", Number(firstPlan.vehicle_id));
        if (firstPlan.branch_id) form.setValue("starting_point", Number(firstPlan.branch_id));
      }
    }

    if (newIds.length === 0) {
      setPlanDetails([]);
      return;
    }

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

  useEffect(() => {
    if (open && planId) {
      const fetchDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=post_plan_details&plan_id=${planId}`
          );
          if (!res.ok) throw new Error("Failed to load details");
          const result = await res.json();
          const p = result.data;

          form.reset({
            pre_dispatch_plan_ids: p.dispatch_id ? [Number(p.dispatch_id)] : [],
            starting_point: p.starting_point || 0,
            vehicle_id: p.vehicle_id || 0,
            driver_id: p.driver_id || 0,
            estimated_time_of_dispatch: p.estimated_time_of_dispatch || "",
            estimated_time_of_arrival: p.estimated_time_of_arrival || "",
            remarks: p.remarks || "",
            amount: p.amount || 0,
            helpers: p.helpers?.length ? p.helpers : [{ user_id: 0 }],
          });

          if (p.dispatch_id) {
            setIsLoadingDetails(true);
            const detailsRes = await fetch(
              `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=plan_details&plan_ids=${p.dispatch_id}&trip_id=${planId}`
            );
            const detailsResult = await detailsRes.json();
            setPlanDetails(detailsResult.data || []);
            setIsLoadingDetails(false);
          }
        } catch (error: any) {
          toast.error(error.message || "Could not load plan details");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    } else {
      form.reset();
      setPlanDetails([]);
    }
  }, [open, planId, form]);

  const onSubmit = async (values: DispatchCreationFormValues) => {
    if (!planId) return;
    
    const payload = {
      ...values,
      invoices: planDetails
        .filter((d: PlanDetailItem) => d.invoice_id !== undefined)
        .map((details: PlanDetailItem, index: number) => ({
          invoice_id: details.invoice_id!,
          sequence: index + 1,
        })),
    };

    try {
      setIsSaving(true);
      await dispatchCreationLifecycleService.updateTrip(planId, payload);
      toast.success("Dispatch trip updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update dispatch trip");
    } finally {
      setIsSaving(false);
    }
  };

  const isDataReady = !isLoadingMasterData && masterData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-xl">
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
          <div className="p-6 space-y-4 min-h-[400px]">
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
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids") || []}
                  onPlanSelect={handlePlanSelect}
                  selectedBranch={selectedBranch}
                  selectedAmount={form.watch("amount")}
                />

                <TripConfigurationForm masterData={masterData} />

                <InvoiceItemsSidebar
                  selectedPlanIds={form.watch("pre_dispatch_plan_ids") || []}
                  planDetails={planDetails}
                  isLoadingDetails={isLoadingDetails}
                  onReorder={setPlanDetails}
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
