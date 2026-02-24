"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { vehicleCategorySchema, VehicleCategoryFormValues, VehicleCategoryApiRow } from "../types";
import { createVehicleCategory, updateVehicleCategory } from "../providers/fetchProviders";

interface VehicleCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: VehicleCategoryApiRow | null;
  onSuccess: () => void;
}

export function VehicleCategoryDialog({
  open,
  onOpenChange,
  selectedCategory,
  onSuccess,
}: VehicleCategoryDialogProps) {
  const isEdit = !!selectedCategory;

  const form = useForm<VehicleCategoryFormValues>({
    resolver: zodResolver(vehicleCategorySchema) as any,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: selectedCategory?.name || "",
        description: selectedCategory?.description || "",
      });
    }
  }, [open, selectedCategory, form]);

  const onSubmit: SubmitHandler<VehicleCategoryFormValues> = async (values) => {
    try {
      if (isEdit && selectedCategory) {
        await updateVehicleCategory(selectedCategory.id, values);
        toast.success("Vehicle category updated successfully");
      } else {
        await createVehicleCategory(values);
        toast.success("Vehicle category created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("unique") || error.message?.includes("UNIQUE")) {
        toast.error("This vehicle category name already exists.");
      } else {
        toast.error(error.message || "Something went wrong");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Vehicle Category" : "Create Vehicle Category"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update vehicle category details below."
              : "Register a new vehicle category to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Heavy Duty, Light Vehicle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
