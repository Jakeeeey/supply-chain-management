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

import { fuelTypeSchema, FuelTypeFormValues, FuelTypeApiRow } from "../types";
import { createFuelType, updateFuelType } from "../providers/fetchProviders";

interface FuelTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFuelType: FuelTypeApiRow | null;
  onSuccess: () => void;
}

export function FuelTypeDialog({
  open,
  onOpenChange,
  selectedFuelType,
  onSuccess,
}: FuelTypeDialogProps) {
  const isEdit = !!selectedFuelType;

  const form = useForm<FuelTypeFormValues>({
    resolver: zodResolver(fuelTypeSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: selectedFuelType?.name || "",
        description: selectedFuelType?.description || "",
      });
    }
  }, [open, selectedFuelType, form]);

  const onSubmit: SubmitHandler<FuelTypeFormValues> = async (values) => {
    try {
      if (isEdit && selectedFuelType) {
        await updateFuelType(selectedFuelType.id, values);
        toast.success("Fuel type updated successfully");
      } else {
        await createFuelType(values);
        toast.success("Fuel type created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Something went wrong";

      if (message.includes("unique") || message.includes("UNIQUE")) {
        toast.error("This fuel type name already exists.");
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Fuel" : "Create Fuel Type"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update fuel details below."
              : "Register a new fuel type to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Diesel, Gasoline" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
