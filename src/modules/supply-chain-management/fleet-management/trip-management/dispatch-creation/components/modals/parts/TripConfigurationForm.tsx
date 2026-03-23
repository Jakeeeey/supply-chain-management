"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Truck, X } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { DateTimePicker } from "../../shared/date-time-picker";
import { DispatchCreationFormValues } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { useMemo } from "react";

interface MasterData {
  branches: { id: number; branch_name: string }[];
  vehicles: { vehicle_id: number; vehicle_plate: string; vehicle_type_name?: string }[];
  drivers: { user_id: number; user_fname: string; user_lname: string }[];
  helpers: { user_id: number; user_fname: string; user_lname: string }[];
}

interface TripConfigurationFormProps {
  masterData: MasterData | null;
}

export function TripConfigurationForm({ masterData }: TripConfigurationFormProps) {
  const form = useFormContext<DispatchCreationFormValues>();
  const { fields: helperFields, append, remove } = useFieldArray({
    control: form.control,
    name: "helpers",
  });

  // Watch helper values for filtering duplicates
  const selectedHelpers = form.watch("helpers") || [];
  const selectedHelperIds = useMemo(() => 
    new Set(selectedHelpers.map(h => h.user_id).filter(id => id > 0)),
    [selectedHelpers]
  );

  const getHelperOptions = (currentIndex: number) => {
    if (!masterData?.helpers) return [];
    const currentId = selectedHelpers[currentIndex]?.user_id;
    return masterData.helpers.map(h => ({
      value: String(h.user_id),
      label: `${h.user_fname} ${h.user_lname}`,
      disabled: h.user_id !== currentId && selectedHelperIds.has(h.user_id)
    }));
  };

  return (
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
              <FormItem className="flex flex-col">
                <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                  Source Branch
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={masterData?.branches.map(b => ({
                      value: String(b.id),
                      label: b.branch_name
                    })) || []}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                    placeholder="Select branch"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Vehicle */}
          <FormField
            control={form.control}
            name="vehicle_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                  Vehicle
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={masterData?.vehicles.map(v => ({
                      value: String(v.vehicle_id),
                      label: `${v.vehicle_plate}${v.vehicle_type_name ? ` (${v.vehicle_type_name})` : ""}`
                    })) || []}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                    placeholder="Select vehicle"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Departure (ETOD) */}
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

          {/* Arrival (ETOA) */}
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
              <FormItem className="flex flex-col">
                <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                  Driver
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={masterData?.drivers.map(d => ({
                      value: String(d.user_id),
                      label: `${d.user_fname} ${d.user_lname}`
                    })) || []}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                    placeholder="Assign a driver"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          {/* Primary Helper */}
          <FormField
            control={form.control}
            name="helpers.0.user_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                  Helper
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={getHelperOptions(0)}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                    placeholder="Assign a helper"
                  />
                </FormControl>
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
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight flex items-center justify-between">
                        Helper {index + 1}
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={getHelperOptions(index)}
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(Number(val))}
                          placeholder="Select additional helper"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
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
  );
}
