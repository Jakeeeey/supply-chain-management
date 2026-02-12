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

import { brandSchema, BrandFormValues, BrandApiRow } from "../types";
import { createBrand, updateBrand } from "../providers/fetchProviders";

interface BrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBrand: BrandApiRow | null;
  onSuccess: () => void;
}

export function BrandDialog({
  open,
  onOpenChange,
  selectedBrand,
  onSuccess,
}: BrandDialogProps) {
  const isEdit = !!selectedBrand;

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema) as any, // ✅ Type safety fix
    defaultValues: {
      brand_name: "",
      sku_code: "", // ✅ Default value
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        brand_name: selectedBrand?.brand_name || "",
        sku_code: selectedBrand?.sku_code || "", // ✅ Load existing value
      });
    }
  }, [open, selectedBrand, form]);

  const onSubmit: SubmitHandler<BrandFormValues> = async (values) => {
    try {
      if (isEdit && selectedBrand) {
        await updateBrand(selectedBrand.brand_id, values);
        toast.success("Brand updated successfully");
      } else {
        await createBrand(values);
        toast.success("Brand created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message.includes("unique")) {
        toast.error("This Brand Name or Code already exists.");
      } else {
        toast.error(error.message || "Something went wrong");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Brand" : "Create Brand"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update brand details below."
              : "Register a new brand to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="brand_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Brand Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Toyota, Nike" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ Added SKU Code Field */}
            <FormField
              control={form.control as any}
              name="sku_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. TOY, NK" {...field} />
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
                {isEdit ? "Save Changes" : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
