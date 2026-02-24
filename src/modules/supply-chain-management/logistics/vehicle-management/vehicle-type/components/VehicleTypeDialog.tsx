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
import { Button } from "@/components/ui/button";

import { vehicleTypeSchema, VehicleTypeFormValues, VehicleTypeApiRow } from "../types";
import { createVehicleType, updateVehicleType } from "../providers/fetchProviders";

interface VehicleTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVehicleType: VehicleTypeApiRow | null;
  onSuccess: () => void;
}

export function VehicleTypeDialog({
  open,
  onOpenChange,
  selectedVehicleType,
  onSuccess,
}: VehicleTypeDialogProps) {
  const isEdit = !!selectedVehicleType;

  const form = useForm<VehicleTypeFormValues>({
    resolver: zodResolver(vehicleTypeSchema) as any,
    defaultValues: {
      type_name: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type_name: selectedVehicleType?.type_name || "",
      });
    }
  }, [open, selectedVehicleType, form]);

  const onSubmit: SubmitHandler<VehicleTypeFormValues> = async (values) => {
    try {
      if (isEdit && selectedVehicleType) {
        await updateVehicleType(selectedVehicleType.id, values);
        toast.success("Vehicle type updated successfully");
      } else {
        await createVehicleType(values);
        toast.success("Vehicle type created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Vehicle Type" : "Create Vehicle Type"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update vehicle type details below."
              : "Register a new vehicle type to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="type_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4 Wheeler Truck" {...field} />
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
