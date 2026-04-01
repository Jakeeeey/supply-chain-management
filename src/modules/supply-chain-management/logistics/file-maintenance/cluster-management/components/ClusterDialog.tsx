"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

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

import { clusterSchema, ClusterFormValues, ClusterWithAreas } from "../types";
import { createCluster, updateCluster, fetchProvinces } from "../providers/fetchProviders";
import { AreaRow } from "./AreaRow";

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

  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(clusterSchema) as unknown as Resolver<ClusterFormValues>,
    defaultValues: {
      cluster_name: "",
      minimum_amount: 0,
      areas: [{ province: "", city: "", baranggay: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "areas",
  });

  const [provinces, setProvinces] = useState<{code: string; name: string}[]>([]);

  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
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
        });
      } else {
        form.reset({
          cluster_name: "",
          minimum_amount: 0,
          areas: [{ province: "", city: "", baranggay: "" }],
        });
      }
    }
  }, [open, selectedCluster, form]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Cluster" : "Create Cluster"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update cluster details and areas below."
              : "Define a new cluster with its areas and minimum amount."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
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
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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
                    append({ province: "", city: "", baranggay: "" })
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

            {/* ── Footer ──────────────────────────────────────────────── */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Save Changes" : "Create Cluster"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
