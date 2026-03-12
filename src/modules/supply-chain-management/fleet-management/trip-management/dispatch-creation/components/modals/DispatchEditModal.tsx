"use client";

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
import { useDispatchCreation } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/hooks/useDispatchCreation";
import {
  DispatchCreationFormSchema,
  DispatchCreationFormValues,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DateTimePicker } from "../shared/date-time-picker";

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
  const { masterData, refreshMasterData } = useDispatchCreation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && !masterData) {
      refreshMasterData();
    }
  }, [open, masterData, refreshMasterData]);

  const form = useForm<DispatchCreationFormValues>({
    resolver: zodResolver(DispatchCreationFormSchema),
    defaultValues: {
      pre_dispatch_plan_id: 1, // Dummy to satisfy schema
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

          form.reset({
            pre_dispatch_plan_id: p.pre_dispatch_plan_id || 1,
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
        } catch (error: any) {
          toast.error(error.message || "Could not load plan details");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    } else {
      form.reset();
    }
  }, [open, planId, form]);

  const onSubmit = async (values: DispatchCreationFormValues) => {
    if (!planId) return;
    setIsSaving(true);
    try {
      const { dispatchCreationLifecycleService } = await import(
        "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/lifecycle"
      );
      await dispatchCreationLifecycleService.updateTrip(planId, values);
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
      <DialogContent className="max-w-xl h-[85vh] p-0 flex flex-col gap-0 border-border/50 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/20 shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Edit Trip Configuration
          </DialogTitle>
          <p className="text-sm text-muted-foreground m-0">
            Update vehicle, driver, times, and routing for this dispatch plan.
          </p>
        </DialogHeader>

        {isLoading || !masterData ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
              <p className="text-sm font-medium animate-pulse">
                Loading trip details...
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 flex flex-col min-h-0"
            >
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
                        if (index === 0) return null; // Primary helper is in the main grid
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

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex gap-3 justify-end shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="font-medium text-sm border-border hover:bg-background"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-medium text-sm shadow-sm"
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin opacity-70" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
