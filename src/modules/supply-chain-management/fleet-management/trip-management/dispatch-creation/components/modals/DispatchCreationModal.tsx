"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/hooks/useDispatchCreation";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

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

  const form = useForm<DispatchCreationFormValues>({
    resolver: zodResolver(DispatchCreationFormSchema),
    defaultValues: {
      pre_dispatch_plan_id: 0,
      starting_point: 0,
      vehicle_id: 0,
      driver_id: 0,
      estimated_time_of_dispatch: "",
      estimated_time_of_arrival: "",
      remarks: "",
      amount: 0,
      helpers: [],
      budgets: [],
    },
  });

  const {
    fields: helperFields,
    append: addHelper,
    remove: removeHelper,
  } = useFieldArray({
    control: form.control,
    name: "helpers",
  });

  const {
    fields: budgetFields,
    append: addBudget,
    remove: removeBudget,
  } = useFieldArray({
    control: form.control,
    name: "budgets",
  });

  useEffect(() => {
    if (open) {
      form.reset();
      loadApprovedPlans();
    }
  }, [open, form]);

  const loadApprovedPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-creation?type=approved_plans",
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

  const handlePlanSelect = (planIdStr: string) => {
    const planId = Number(planIdStr);
    const plan = approvedPlans.find((p) => p.dispatch_id === planId);
    if (!plan) return;

    form.setValue("pre_dispatch_plan_id", planId);
    form.setValue("amount", plan.total_amount || 0);
    if (plan.driver_id) form.setValue("driver_id", Number(plan.driver_id));
    if (plan.vehicle_id) form.setValue("vehicle_id", Number(plan.vehicle_id));
    if (plan.branch_id) form.setValue("starting_point", Number(plan.branch_id));
  };

  const onSubmit = async (values: DispatchCreationFormValues) => {
    try {
      await createTrip(values);
      toast.success("Dispatch Trip created successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create dispatch trip");
    }
  };

  const isDataReady = !isLoadingMasterData && !isLoadingPlans && masterData;
  const filteredPlans = approvedPlans.filter(
    (p) =>
      p.dispatch_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cluster_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Dispatch Plan</DialogTitle>
          <DialogDescription>
            Configure vehicle, staff, and select a pre-dispatch plan for
            delivery routing.
          </DialogDescription>
        </DialogHeader>

        {!isDataReady ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* LEFT COL: Configuration properties */}
                <div className="lg:col-span-2 space-y-6">
                  {/* --- 1. Trip Configuration --- */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                      Trip Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="starting_point"
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">
                              Source Branch
                            </FormLabel>
                            <Select
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              value={
                                field.value ? String(field.value) : undefined
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {masterData?.branches.map((b) => (
                                  <SelectItem key={b.id} value={String(b.id)}>
                                    {b.branch_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicle_id"
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">
                              Select Vehicle
                            </FormLabel>
                            <Select
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              value={
                                field.value ? String(field.value) : undefined
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select truck" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {masterData?.vehicles.map((v) => (
                                  <SelectItem
                                    key={v.vehicle_id}
                                    value={String(v.vehicle_id)}
                                  >
                                    {v.vehicle_plate}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimated_time_of_dispatch"
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">
                              ETOD (Departure)
                            </FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimated_time_of_arrival"
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">
                              ETOA (Est. Arrival)
                            </FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">
                              Remarks (Optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. priority loading"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* --- 2. Crew Assignment --- */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                      Crew Assignment
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="driver_id"
                        render={({ field }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">
                              Assigned Driver
                            </FormLabel>
                            <Select
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              value={
                                field.value ? String(field.value) : undefined
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select driver" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {masterData?.drivers.map((d) => (
                                  <SelectItem
                                    key={d.user_id}
                                    value={String(d.user_id)}
                                  >
                                    {d.user_fname} {d.user_lname}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-2 md:col-span-1 space-y-3">
                        <FormLabel className="text-xs font-semibold">
                          Helpers (Max 2)
                        </FormLabel>
                        {[0, 1].map((idx) => (
                          <FormField
                            key={idx}
                            control={form.control}
                            name={`helpers.${idx}.user_id`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={(val) =>
                                    field.onChange(Number(val))
                                  }
                                  value={
                                    field.value
                                      ? String(field.value)
                                      : undefined
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={`Select helper ${idx + 1}`}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {masterData?.helpers.map((h) => (
                                      <SelectItem
                                        key={h.user_id}
                                        value={String(h.user_id)}
                                      >
                                        {h.user_fname} {h.user_lname}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COL: PDP Selection */}
                <div className="flex flex-col border rounded-lg overflow-hidden h-[500px] bg-white">
                  <div className="p-4 border-b space-y-3 bg-white">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-500" />
                      Cargo Selection
                    </h3>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search Pre-Dispatch Plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
                    {filteredPlans.map((p) => {
                      const isSelected =
                        form.getValues("pre_dispatch_plan_id") ===
                        p.dispatch_id;
                      return (
                        <div
                          key={p.dispatch_id}
                          onClick={() =>
                            handlePlanSelect(String(p.dispatch_id))
                          }
                          className={`group p-4 rounded-lg border-2 text-sm cursor-pointer transition-all relative ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/10 shadow-sm"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1 pr-6">
                            <div className="font-bold text-slate-900">
                              {p.dispatch_no}
                            </div>
                            <div className="font-bold text-slate-900">
                              ₱
                              {Number(p.total_amount).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2 },
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                            <span>{p.cluster_name || "NCR"} Cluster</span>
                            <span>3 Stops</span>
                          </div>

                          {/* Radio-style indicator like image 1 */}
                          <div className="absolute top-4 right-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-200"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredPlans.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Package className="w-10 h-10 mb-2 opacity-10" />
                        <p className="text-xs italic">No plans available.</p>
                      </div>
                    )}
                  </div>

                  {/* Summary section like image 2 */}
                  <div className="p-4 bg-slate-50 border-t flex flex-col items-center justify-center min-h-[100px]">
                    <span className="text-[11px] text-slate-500 font-semibold mb-1 uppercase tracking-tight">
                      Selected Route Value
                    </span>
                    <div className="text-2xl font-black text-blue-600 tracking-tighter">
                      ₱
                      {form.watch("amount")?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-6 h-10 font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSubmitting || !form.watch("pre_dispatch_plan_id")}
                  type="submit"
                  className="px-8 h-10 bg-blue-600 hover:bg-blue-700 font-bold shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Dispatch Plan"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
