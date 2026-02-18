"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

import { categorySchema, CategoryFormValues, CategoryApiRow } from "../types";
import { createCategory, updateCategory } from "../providers/fetchProviders";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: CategoryApiRow | null;
  onSuccess: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  selectedCategory,
  onSuccess,
}: CategoryDialogProps) {
  const isEdit = !!selectedCategory;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_name: "",
      sku_code: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category_name: selectedCategory?.category_name || "",
        sku_code: selectedCategory?.sku_code || "",
      });
    }
  }, [open, selectedCategory, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (isEdit && selectedCategory) {
        await updateCategory(selectedCategory.category_id, values);
        toast.success("Category updated");
      } else {
        await createCategory(values);
        toast.success("Category created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message.includes("unique")) {
        toast.error("This Category Name already exists.");
      } else {
        toast.error(error.message || "Operation failed");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            Manage product categories and their default SKU codes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Electronics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ELEC" {...field} />
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
                {isEdit ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
