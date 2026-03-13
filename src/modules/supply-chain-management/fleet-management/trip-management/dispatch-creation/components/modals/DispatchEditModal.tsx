"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/hooks/useDispatchCreation";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  GripVertical,
  Loader2,
  MapPin,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/lifecycle";
import { DateTimePicker } from "../shared/date-time-picker";

interface PlanDetailItem {
  detail_id: number;
  sales_order_id: number;
  invoice_id: number;
  order_no: string;
  order_status: string;
  true_order_status?: string;
  customer_name: string;
  city: string;
  amount: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "For Picking":
      return "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/15";
    case "For Invoicing":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/15";
    case "For Loading":
      return "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/15";
    case "On Hold":
      return "bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/15";
    default:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/15";
  }
};

function DraggableInvoiceItem({ order }: { order: PlanDetailItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.detail_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-background text-xs space-y-1.5 transition-shadow",
        isDragging &&
          "shadow-lg ring-1 ring-primary/20 z-10 opacity-50 cursor-grabbing",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-foreground">
            {order.order_no}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] font-medium uppercase tracking-wide px-1.5 py-0 h-4 rounded border transition-colors",
            getStatusColor(order.order_status),
          )}
        >
          {order.order_status}
        </Badge>
      </div>
      <p className="text-muted-foreground truncate pl-6">
        {order.customer_name}
      </p>
      <div className="flex items-center justify-between pl-6">
        <span className="text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {order.city}
        </span>
        <span className="font-semibold text-foreground tabular-nums">
          ₱
          {Number(order.amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setPlanDetails((items) => {
        const oldIndex = items.findIndex((i) => i.detail_id === active.id);
        const newIndex = items.findIndex((i) => i.detail_id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  useEffect(() => {
    if (open && !masterData) {
      refreshMasterData();
    }
  }, [open, masterData, refreshMasterData]);

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
      helpers: [{ user_id: 0 }],
      budgets: [],
    },
  });

  const { fields: helperFields, append, remove } = useFieldArray({
    control: form.control,
    name: "helpers",
  });

  const selectedBranch = form.watch("starting_point");
  const selectedPlanId = form.watch("pre_dispatch_plan_id");

  // Load plans when branch changes
  useEffect(() => {
    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(selectedBranch, selectedPlanId);
    } else {
      setApprovedPlans([]);
    }
  }, [selectedBranch, selectedPlanId]);

  const loadApprovedPlans = async (branchId: number, currentPdpId?: number) => {
    setIsLoadingPlans(true);
    // Note: Don't clear approvedPlans here to avoid flashing if currentPdpId changed but branch stayed same
    try {
      const url = new URL(
        "/api/scm/fleet-management/trip-management/dispatch-creation",
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
    const plan = approvedPlans.find((p) => (p.dispatch_id || p.id) === planId);
    if (!plan) return;

    form.setValue("pre_dispatch_plan_id", planId);
    form.setValue("amount", plan.total_amount || 0);
    if (plan.driver_id) form.setValue("driver_id", Number(plan.driver_id));
    if (plan.vehicle_id) form.setValue("vehicle_id", Number(plan.vehicle_id));
    // Usually branch is already set if searching, but sync it anyway
    if (plan.branch_id) form.setValue("starting_point", Number(plan.branch_id));

    // Fetch plan details (sales orders)
    setIsLoadingDetails(true);
    setPlanDetails([]);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-creation?type=plan_details&plan_id=${planId}`,
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
            `/api/scm/fleet-management/trip-management/dispatch-creation?type=post_plan_details&plan_id=${planId}`
          );
          if (!res.ok) throw new Error("Failed to load details");
          const result = await res.json();
          const p = result.data;
          console.log("[DispatchEditModal] Loaded trip details:", p);

          form.reset({
            pre_dispatch_plan_id: Number(p.dispatch_id || 0),
            starting_point: p.starting_point || 0,
            vehicle_id: p.vehicle_id || 0,
            driver_id: p.driver_id || 0,
            estimated_time_of_dispatch: p.estimated_time_of_dispatch || "",
            estimated_time_of_arrival: p.estimated_time_of_arrival || "",
            remarks: p.remarks || "",
            amount: p.amount || 0,
            helpers: p.helpers?.length ? p.helpers : [{ user_id: 0 }],
            budgets: [],
          });

          // Also load the current PDP's invoices (pass trip_id to get SAVED order)
          if (p.dispatch_id) {
            setIsLoadingDetails(true);
            const detailsRes = await fetch(
              `/api/scm/fleet-management/trip-management/dispatch-creation?type=plan_details&plan_id=${p.dispatch_id}&trip_id=${planId}`
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

  const filteredPlans = approvedPlans.filter(
    (p) =>
      p.dispatch_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cluster_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onSubmit = async (values: DispatchCreationFormValues) => {
    if (!planId) return;
    setIsSaving(true);
    try {
      const payloadWithInvoices = {
        ...values,
        invoices: planDetails.map((d, idx) => ({
          invoice_id: d.invoice_id,
          sequence: idx + 1,
        })),
      };
      await dispatchCreationLifecycleService.updateTrip(planId, payloadWithInvoices);
      toast.success("Dispatch plan updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update dispatch plan.");
    } finally {
      setIsSaving(false);
    }
  };

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
                Edit Trip Configuration
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update vehicle, driver, times, and routing for this dispatch plan.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading || !masterData ? (
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
                {/* LEFT: PDP Selection */}
                <div className="w-sm flex flex-col overflow-hidden bg-muted/20">
                  <div className="p-4 border-b border-border/50 space-y-3 bg-background/60">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pre-Dispatch Plan
                    </p>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                      <Input
                        placeholder="Search plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-background border-border/60"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {!selectedBranch || selectedBranch === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                        <p className="text-xs">Select a source branch first.</p>
                      </div>
                    ) : isLoadingPlans ? (
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    ) : filteredPlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                        <p className="text-xs">
                          No approved plans for this branch.
                        </p>
                      </div>
                    ) : (
                      filteredPlans.map((p) => {
                        const pId = Number(p.dispatch_id || p.id);
                        const isSelected = Number(selectedPlanId) === pId;
                        return (
                          <button
                            type="button"
                            key={pId}
                            onClick={() =>
                              handlePlanSelect(String(pId))
                            }
                            className={cn(
                              "w-full text-left p-3 rounded-lg border text-sm transition-all duration-150",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/50 bg-background hover:border-border hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="default"
                                    className="text-[9px] font-medium tracking-wide px-1.5 py-0 h-4 rounded-full"
                                  >
                                    {p.status}
                                  </Badge>
                                  <p className="font-semibold text-foreground text-xs truncate">
                                    {p.dispatch_no}
                                  </p>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {p.cluster_name || "Unassigned"} ·{" "}
                                  {p.total_items || 0} items
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {isSelected ? (
                                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-border" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* CENTER: Trip Configuration */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <section className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" />
                      Trip Configuration
                    </p>
                    <div className="grid grid-cols-2 gap-4 auto-rows-min">
                      {/* Source Branch */}
                      <FormField
                        control={form.control}
                        name="starting_point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Source Branch
                            </FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(Number(val))}
                              value={field.value ? String(field.value) : undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-background/50">
                                  <SelectValue placeholder="Select branch" />
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Vehicle */}
                      <FormField
                        control={form.control}
                        name="vehicle_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Vehicle
                            </FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(Number(val))}
                              value={field.value ? String(field.value) : undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-background/50">
                                  <SelectValue placeholder="Select vehicle" />
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* ETOD */}
                      <FormField
                        control={form.control}
                        name="estimated_time_of_dispatch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Departure (ETOD)
                            </FormLabel>
                            <FormControl>
                              <DateTimePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select departure"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* ETOA */}
                      <FormField
                        control={form.control}
                        name="estimated_time_of_arrival"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Arrival (ETOA)
                            </FormLabel>
                            <FormControl>
                              <DateTimePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select arrival"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Driver */}
                      <FormField
                        control={form.control}
                        name="driver_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Driver
                            </FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(Number(val))}
                              value={field.value ? String(field.value) : undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-background/50">
                                  <SelectValue placeholder="Assign a driver" />
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Helper 1 (Required) */}
                      <FormField
                        control={form.control}
                        name="helpers.0.user_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Helper
                            </FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(Number(val))}
                              value={field.value ? String(field.value) : undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-background/50">
                                  <SelectValue placeholder="Assign a helper" />
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Remarks */}
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                              Remarks
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Additional notes for the trip..."
                                className="h-9 text-sm bg-background/50"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>

                  {/* Additional Helpers */}
                  {helperFields.length > 1 && (
                    <section className="space-y-3 pt-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Additional Crew
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {helperFields.map((field, index) => {
                          if (index === 0) return null;
                          return (
                            <FormField
                              key={field.id}
                              control={form.control}
                              name={`helpers.${index}.user_id`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight flex items-center justify-between">
                                    Helper {index + 1}
                                    <button
                                      type="button"
                                      onClick={() => remove(index)}
                                      className="text-destructive hover:text-destructive/80 transition-colors"
                                    >
                                      Remove
                                    </button>
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
                                      <SelectTrigger className="h-9 text-sm bg-background/50">
                                        <SelectValue placeholder="Select additional helper" />
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
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {helperFields.length < 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => append({ user_id: 0 })}
                      className="text-[11px] h-7 w-fit text-primary hover:text-primary hover:bg-primary/5 -mt-2"
                    >
                      + Add Additional Helper
                    </Button>
                  )}
                </div>

                {/* RIGHT: Sales Invoices */}
                <div className="w-[340px] flex flex-col overflow-hidden bg-muted/20 shrink-0">
                  <div className="p-4 border-b border-border/50 bg-background/60">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Sales Invoices
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {selectedPlanId > 0
                        ? `${planDetails.length} invoice${planDetails.length !== 1 ? "s" : ""} linked`
                        : "Select a PDP to view invoices"}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {!selectedPlanId || selectedPlanId === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
                        <ShoppingCart className="w-8 h-8 mb-2" />
                        <p className="text-xs">Select a plan to see invoices</p>
                      </div>
                    ) : isLoadingDetails ? (
                      <div className="space-y-2 p-1">
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                      </div>
                    ) : planDetails.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
                        <p className="text-xs">No invoices linked to this plan.</p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={planDetails.map((o) => o.detail_id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {planDetails.map((order) => (
                              <DraggableInvoiceItem
                                key={order.detail_id}
                                order={order}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {selectedPlanId > 0 &&
                  planDetails.length > 0 &&
                  planDetails.some(
                    (o) =>
                      o.true_order_status !== "For Loading" &&
                      o.true_order_status !== "On Hold",
                  )
                    ? "⚠ Some items are not ready for dispatch (must be For Loading or On Hold)."
                    : selectedPlanId > 0
                      ? "Ready to dispatch — review details before confirming."
                      : "Select a pre-dispatch plan to continue."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={isSaving}
                    className="h-8 px-4 text-sm font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isSaving ||
                      !selectedPlanId ||
                      planDetails.length === 0 ||
                      planDetails.some(
                        (o) =>
                          o.true_order_status !== "For Loading" &&
                          o.true_order_status !== "On Hold",
                      )
                    }
                    className="h-8 px-4 text-sm font-medium"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Saving...
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
