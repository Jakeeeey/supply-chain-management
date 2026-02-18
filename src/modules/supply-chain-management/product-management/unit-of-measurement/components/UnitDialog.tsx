"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form"; // ✅ Added SubmitHandler
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

import { unitSchema, UnitFormValues, UnitApiRow } from "../types";
import { createUnit, updateUnit } from "../providers/fetchProviders";

interface UnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUnit: UnitApiRow | null;
  onSuccess: () => void;
}

export function UnitDialog({
  open,
  onOpenChange,
  selectedUnit,
  onSuccess,
}: UnitDialogProps) {
  const isEdit = !!selectedUnit;

  const form = useForm<UnitFormValues>({
    // 🔴 THE NUCLEAR FIX: Casting resolver to 'any' stops the type conflict
    resolver: zodResolver(unitSchema) as any,
    defaultValues: {
      unit_name: "",
      unit_shortcut: "",
      sku_code: "",
      order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        unit_name: selectedUnit?.unit_name || "",
        unit_shortcut: selectedUnit?.unit_shortcut || "",
        sku_code: selectedUnit?.sku_code || "",
        order: selectedUnit?.order || 0,
      });
    }
  }, [open, selectedUnit, form]);

  // ✅ Explicitly typed SubmitHandler
  const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
    try {
      if (isEdit && selectedUnit) {
        await updateUnit(selectedUnit.unit_id, values);
        toast.success("Unit updated");
      } else {
        await createUnit(values);
        toast.success("Unit created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message.includes("unique")) {
        toast.error("This Unit Name or Shortcut already exists.");
      } else {
        toast.error(error.message || "Operation failed");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Unit" : "Create Unit"}</DialogTitle>
          <DialogDescription>
            Manage measurement units used across the system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                // 🔴 FIX: Casting control to 'any' to satisfy shadcn FormField
                control={form.control as any}
                name="unit_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Kilogram" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="unit_shortcut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Shortcut <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name="sku_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. KG-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      // Handle number conversion manually
                      onChange={(e) => field.onChange(e.target.value)}
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
                {isEdit ? "Save Changes" : "Create Unit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
