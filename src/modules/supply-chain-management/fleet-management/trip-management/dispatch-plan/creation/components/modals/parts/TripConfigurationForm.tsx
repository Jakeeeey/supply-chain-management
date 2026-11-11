"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "../../shared/SearchableSelect";
import { Combobox } from "../../shared/Combobox";
import { AlertCircle, Fuel, MapPin, Plus, Trash2, Truck, Wallet, X } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { DateTimePicker } from "../../shared/date-time-picker";
import { DispatchCreationFormValues } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ClusterRow,
  DispatchCreationMasterData,
  EnrichedApprovedPlan,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.types";

interface TripConfigurationFormProps {
  masterData: DispatchCreationMasterData | null;
  approvedPlans?: EnrichedApprovedPlan[];
  vehicleCapacity: number;
  disabled?: boolean;
}

export function TripConfigurationForm({
  masterData,
  approvedPlans = [],
  vehicleCapacity,
  disabled,
}: TripConfigurationFormProps) {
  const form = useFormContext<DispatchCreationFormValues>();
  const { fields: helperFields, append: appendHelper, remove: removeHelper } = useFieldArray({
    control: form.control,
    name: "helpers",
  });

  const { fields: budgetFields, append: appendBudget, remove: removeBudget } = useFieldArray({
    control: form.control,
    name: "budgets",
  });

  // Watch helper values and driver for filtering duplicates
  const selectedHelpers = form.watch("helpers") || [];
  const driverId = form.watch("driver_id");
  const watchedPdpIds = form.watch("pre_dispatch_plan_ids");

  const getHelperOptions = (currentIndex: number) => {
    if (!masterData?.helpers) return [];

    // Calculate disabled IDs on the fly to avoid reference staleness from React Hook Form
    const currentDisabledIds = new Set(selectedHelpers.map(h => h.user_id).filter(id => id > 0));
    if (driverId) currentDisabledIds.add(driverId);

    const currentId = selectedHelpers[currentIndex]?.user_id;

    return masterData.helpers.map(h => ({
      value: String(h.user_id),
      label: `${h.user_fname} ${h.user_lname}`,
      disabled: h.user_id !== currentId && currentDisabledIds.has(h.user_id)
    }));
  };

  const coaOptions = masterData?.coa || [];
  const isAutoApprovalEnabled = Boolean(masterData?.isAutoApprovalEnabled);

  // Resolve the winning cluster (highest proximity_level) among all selected PDPs
  const winningClusterData = useMemo(() => {
    const selectedPdpIds = watchedPdpIds || [];
    if (!isAutoApprovalEnabled || !selectedPdpIds.length) return null;

    const clusterLookup = new Map<number, ClusterRow>(
      (masterData?.clusters || []).map((c) => [Number(c.id), c])
    );

    let winningCluster: {
      id: number;
      cluster_name: string;
      proximity_level: number;
    } | null = null;

    for (const pdpId of selectedPdpIds) {
      const pdp = approvedPlans.find((p) => Number(p.dispatch_id) === Number(pdpId));
      if (!pdp || !pdp.cluster_id) continue;

      const clusterId = Number(pdp.cluster_id);
      const fromMaster = clusterLookup.get(clusterId);
      const clusterName = fromMaster?.cluster_name || pdp.cluster_name || "Unknown Cluster";
      const proximityLevel = Number(
        fromMaster?.proximity_level ?? pdp.cluster_proximity_level ?? 0
      );

      if (
        !winningCluster ||
        proximityLevel > winningCluster.proximity_level
      ) {
        winningCluster = {
          id: clusterId,
          cluster_name: clusterName,
          proximity_level: proximityLevel,
        };
      }
    }

    if (!winningCluster) return null;

    const clusterBudgets = (masterData?.cluster_coa_budgets || []).filter(
      (b) => Number(b.cluster_id) === winningCluster!.id
    );

    const totalClusterBudget = clusterBudgets.reduce(
      (sum, b) => sum + (Number(b.budget) || 0),
      0
    );

    return {
      cluster: winningCluster,
      budgets: clusterBudgets,
      totalBudget: totalClusterBudget,
    };
  }, [isAutoApprovalEnabled, watchedPdpIds, approvedPlans, masterData]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
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
                      <SearchableSelect
                        options={masterData?.branches.map(b => ({
                          value: String(b.id),
                          label: b.branch_name
                        })) || []}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        placeholder="Select branch"
                        disabled={disabled}
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
                    <FormLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                      Vehicle
                      {vehicleCapacity > 0 && (
                        <span className="ml-1 font-normal text-muted-foreground/70 normal-case tracking-normal">
                          (Max: {Number(vehicleCapacity).toLocaleString()} kg)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={masterData?.vehicles.map(v => ({
                          value: String(v.vehicle_id),
                          label: `${v.vehicle_plate}${v.vehicle_type_name ? ` (${v.vehicle_type_name})` : ""}`
                        })) || []}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        placeholder="Select vehicle"
                        disabled={disabled}
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
                        disabled={disabled}
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
                        disabled={disabled}
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
                      <SearchableSelect
                        options={masterData?.drivers.map(d => ({
                          value: String(d.user_id),
                          label: `${d.user_fname} ${d.user_lname}`,
                          disabled: selectedHelpers.some(h => h.user_id === d.user_id)
                        })) || []}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        placeholder="Assign a driver"
                        disabled={disabled}
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
                      <SearchableSelect
                        options={getHelperOptions(0)}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => field.onChange(Number(val))}
                        placeholder="Assign a helper"
                        disabled={disabled}
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
                        disabled={disabled}
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
                              onClick={() => removeHelper(index)}
                              className="text-destructive hover:text-destructive/80 transition-colors"
                              disabled={disabled}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={getHelperOptions(index)}
                              value={field.value ? String(field.value) : ""}
                              onValueChange={(val: string) => field.onChange(Number(val))}
                              placeholder="Select additional helper"
                              disabled={disabled}
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

          {helperFields.length < 2 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed h-9 text-xs font-medium text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
              onClick={() => appendHelper({ user_id: 0 })}
              disabled={disabled}
            >
              <X className="w-3.5 h-3.5 rotate-45" />
              Add Additional Helper
            </Button>
          )}

          {/* ── Fuel Allocation & Budget Section (Only when dispatch_auto_approval == 1) ── */}
          {isAutoApprovalEnabled && (
            <section className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" />
                  Budget Allocation
                </p>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {budgetFields.length}/5 lines
                </span>
              </div>

              {/* Fuel Allocation per Liters */}
              <FormField
                control={form.control}
                name="fuel_liter"
                render={({ field }) => (
                  <FormItem className="rounded-lg border border-border/50 bg-muted/5 p-3.5 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                          <Fuel className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Fuel Allocation per Liters
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Specify fuel volume allocated in Liters
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <div className="relative w-44 shrink-0">
                          <Input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="font-medium tabular-nums h-9 pr-12 text-right"
                            value={field.value ?? ""}
                            disabled={disabled}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : parseFloat(val));
                            }}
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                            Liters
                          </span>
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              {/* Budget Lines */}
              {budgetFields.length > 0 && (
                <div className="space-y-2">
                  {budgetFields.map((field, index) => {
                    const selectedCoaIds = new Set(
                      (form.getValues("budgets") || [])
                        .map((b, i) => (i !== index ? b.coa_id : null))
                        .filter(Boolean) as number[]
                    );

                    // Disallow COA selection if it is already present in the winning cluster budget
                    const clusterCoaIds = new Set(
                      (winningClusterData?.budgets || [])
                        .map((b) => Number(b.coa_id))
                        .filter(Boolean)
                    );

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-[1fr_120px_1fr_36px] gap-2.5 items-start p-3 rounded-lg border border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors"
                      >
                        <FormField
                          control={form.control}
                          name={`budgets.${index}.coa_id`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Combobox
                                  options={coaOptions.map((c) => ({
                                    value: String(c.coa_id),
                                    label: c.account_title,
                                    disabled: selectedCoaIds.has(c.coa_id) || clusterCoaIds.has(c.coa_id),
                                  }))}
                                  value={field.value ? String(field.value) : ""}
                                  onValueChange={(val) =>
                                    field.onChange(Number(val))
                                  }
                                  placeholder="Select account"
                                  disabled={disabled}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`budgets.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  min="0.01"
                                  step="0.01"
                                  className="font-medium tabular-nums h-9"
                                  value={field.value || ""}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === "" ? undefined : parseFloat(val));
                                  }}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`budgets.${index}.remarks`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input
                                  placeholder="Notes..."
                                  className="h-9 text-xs"
                                  {...field}
                                  value={field.value || ""}
                                  disabled={disabled}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBudget(index)}
                          disabled={disabled}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                onClick={() => appendBudget({ coa_id: 0, amount: 0, remarks: "" })}
                variant="outline"
                className="w-full border-dashed h-9 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center gap-1.5"
                disabled={budgetFields.length >= 5 || disabled}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Budget Line
              </Button>

              {budgetFields.length >= 5 && (
                <Alert className="border-destructive/30 bg-destructive/5 py-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-destructive text-xs font-semibold">
                    Maximum Limit Reached
                  </AlertTitle>
                  <AlertDescription className="text-destructive/80 text-[10px]">
                    You can only add up to 5 budget lines per dispatch plan.
                  </AlertDescription>
                </Alert>
              )}

              {/* ── Dedicated Cluster COA Budget Space ───────────────── */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Cluster COA Budget
                  </p>
                  {winningClusterData && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {winningClusterData.cluster.cluster_name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] px-2 py-0 h-5 tabular-nums"
                      >
                        Level {winningClusterData.cluster.proximity_level}
                      </Badge>
                    </div>
                  )}
                </div>

                {!winningClusterData ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/5 p-6 text-center text-muted-foreground text-xs">
                    Select a Pre-Dispatch Plan to view cluster COA budgets.
                  </div>
                ) : winningClusterData.budgets.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="rounded-lg border border-border/60 overflow-hidden bg-background">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-9 text-xs font-semibold">
                              Account Title
                            </TableHead>
                            <TableHead className="w-[140px] h-9 text-xs font-semibold text-right">
                              Budget (PHP)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {winningClusterData.budgets.map((b, idx) => (
                            <TableRow key={b.id ?? idx}>
                              <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                                {b.account_title || `COA #${b.coa_id}`}
                              </TableCell>
                              <TableCell className="py-2.5 text-right font-semibold tabular-nums text-xs text-foreground">
                                {Number(b.budget).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="rounded-lg bg-muted/40 px-3.5 py-2.5 flex items-center justify-between text-xs border border-border/60">
                      <span className="text-muted-foreground font-medium">
                        Total Allocated Budget:
                      </span>
                      <span className="font-bold tabular-nums text-foreground text-sm">
                        PHP{" "}
                        {winningClusterData.totalBudget.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/5 p-6 text-center text-muted-foreground text-xs">
                    No Chart of Account budgets allocated for{" "}
                    <span className="font-semibold text-foreground">
                      {winningClusterData.cluster.cluster_name}
                    </span>{" "}
                    (Level {winningClusterData.cluster.proximity_level}).
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
