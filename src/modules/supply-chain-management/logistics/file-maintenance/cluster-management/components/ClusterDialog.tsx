"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, ArrowLeft, ArrowRight, Check, MapPin, Wallet } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { clusterSchema, ClusterFormValues, ClusterWithAreas, COAOption } from "../types";
import { createCluster, updateCluster, fetchProvinces, listCoaOptions } from "../providers/fetchProviders";
import { AreaRow } from "./AreaRow";
import { CoaBudgetStep } from "./CoaBudgetStep";

// =============================================================================
// PROPS
// =============================================================================

interface ClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCluster: ClusterWithAreas | null;
  allClusters: ClusterWithAreas[];
  onSuccess: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ClusterDialog({
  open,
  onOpenChange,
  selectedCluster,
  allClusters,
  onSuccess,
}: ClusterDialogProps) {
  const isEdit = !!selectedCluster;
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(clusterSchema) as unknown as Resolver<ClusterFormValues>,
    defaultValues: {
      cluster_name: "",
      minimum_amount: 0,
      areas: [{ province: "", city: "", baranggay: "" }],
      coa_budgets: [],
    },
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "areas",
  });

  const {
    fields: budgetFields,
    append: appendBudget,
    remove: removeBudget,
  } = useFieldArray({
    control: form.control,
    name: "coa_budgets",
  });

  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [coaList, setCoaList] = useState<COAOption[]>([]);

  useEffect(() => {
    fetchProvinces().then(setProvinces);
    listCoaOptions().then(setCoaList);
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      if (selectedCluster) {
        form.reset({
          cluster_name: selectedCluster.cluster_name,
          minimum_amount: selectedCluster.minimum_amount,
          areas:
            selectedCluster.areas.length > 0
              ? selectedCluster.areas.map((a) => ({
                  id: a.id,
                  province: a.province || "",
                  city: a.city || "",
                  baranggay: a.baranggay || "",
                }))
              : [{ province: "", city: "", baranggay: "" }],
          coa_budgets:
            selectedCluster.coa_budgets && selectedCluster.coa_budgets.length > 0
              ? selectedCluster.coa_budgets.map((b) => ({
                  id: b.id,
                  coa_id: b.coa_id,
                  budget: b.budget,
                }))
              : [],
        });
      } else {
        form.reset({
          cluster_name: "",
          minimum_amount: 0,
          areas: [{ province: "", city: "", baranggay: "" }],
          coa_budgets: [],
        });
      }
    }
  }, [open, selectedCluster, form]);

  const handleNextStep = async () => {
    // Validate Step 1 fields before proceeding
    const isStep1Valid = await form.trigger(["cluster_name", "minimum_amount", "areas"]);
    if (!isStep1Valid) {
      toast.error("Please fill in all required fields in Step 1 correctly.");
      return;
    }
    setCurrentStep(2);
  };

  const onSubmit: SubmitHandler<ClusterFormValues> = async (values) => {
    try {
      if (isEdit && selectedCluster) {
        await updateCluster(selectedCluster.id, values);
        toast.success("Cluster updated successfully");
      } else {
        await createCluster(values);
        toast.success("Cluster created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Save failed:", error);
      const msg = error instanceof Error ? error.message : "Failed to save cluster.";
      toast.error(msg, { duration: 5000 });
    }
  };

  const onInvalid = () => {
    toast.error("Please fix the highlighted fields before saving.", { duration: 4000 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Cluster" : "Create Cluster"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? "Define cluster details, minimum amount, and geographic areas."
              : "Allocate Chart of Account budgets for this cluster."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-1 py-1">
          <div
            onClick={() => setCurrentStep(1)}
            className={cn(
              "flex-1 flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors",
              currentStep === 1
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                currentStep === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              1
            </div>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5" /> Details & Areas
            </span>
          </div>

          <div
            onClick={async () => {
              const valid = await form.trigger(["cluster_name", "minimum_amount", "areas"]);
              if (valid) setCurrentStep(2);
            }}
            className={cn(
              "flex-1 flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors",
              currentStep === 2
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                currentStep === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              2
            </div>
            <span className="flex items-center gap-1 truncate">
              <Wallet className="h-3.5 w-3.5" /> COA Budget
            </span>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="flex flex-col min-h-0 flex-1 gap-4"
          >
            {/* ── Scrollable body ──────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {currentStep === 1 && (
                <>
                  {/* ── Cluster Name ────────────────────────────────────────── */}
                  <FormField<ClusterFormValues>
                    control={form.control}
                    name="cluster_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Cluster Name{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. NCR Metro, Cebu Cluster"
                            {...field}
                            value={(field.value as string) ?? ""}
                            onChange={(e) => {
                              field.onChange(e);
                              form.clearErrors("cluster_name");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ── Minimum Amount ──────────────────────────────────────── */}
                  <FormField<ClusterFormValues>
                    control={form.control}
                    name="minimum_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Minimum Amount{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="e.g. 5000"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.valueAsNumber || 0);
                              form.clearErrors("minimum_amount");
                            }}
                            value={(field.value as number) ?? 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* ── Areas ───────────────────────────────────────────────── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Areas <span className="text-red-500">*</span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          prepend({ province: "", city: "", baranggay: "" })
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Area
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <AreaRow
                        key={field.id}
                        index={index}
                        form={form}
                        remove={remove}
                        canRemove={fields.length > 1}
                        provinces={provinces}
                        allClusters={allClusters}
                        currentClusterId={selectedCluster?.id}
                      />
                    ))}

                    {/* Field-array-level error */}
                    {form.formState.errors.areas?.message && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.areas.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <CoaBudgetStep
                  form={form}
                  coaList={coaList}
                  fields={budgetFields}
                  append={appendBudget}
                  remove={removeBudget}
                />
              )}
            </div>

            {/* ── Sticky footer ────────────────────────────────────────── */}
            <DialogFooter className="shrink-0 border-t pt-4 flex flex-row items-center justify-between">
              <div>
                {currentStep === 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep === 1 ? (
                  <Button type="button" onClick={handleNextStep}>
                    Next: COA Budget <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    {isEdit ? "Save Changes" : "Create Cluster"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
