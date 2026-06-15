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

import { productSectionSchema, ProductSectionFormValues, ProductSectionApiRow } from "../types";
import { createProductSection, updateProductSection, checkProductSectionUniqueness } from "../providers/fetchProviders";

interface ProductSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductSection: ProductSectionApiRow | null;
  onSuccess: () => void;
}

export function ProductSectionDialog({
  open,
  onOpenChange,
  selectedProductSection,
  onSuccess,
}: ProductSectionDialogProps) {
  const isEdit = !!selectedProductSection;

  const form = useForm<ProductSectionFormValues>({
    resolver: zodResolver(productSectionSchema),
    defaultValues: {
      section_name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        section_name: selectedProductSection?.section_name || "",
        description: selectedProductSection?.description || "",
      });
    }
  }, [open, selectedProductSection, form]);

  const onSubmit: SubmitHandler<ProductSectionFormValues> = async (values) => {
    try {
      // 🛡️ Strict Uniqueness Checker
      const nameUnique = await checkProductSectionUniqueness("section_name", values.section_name, selectedProductSection?.id);
      if (!nameUnique) {
        toast.error(`The Product Section Name "${values.section_name}" is already in use.`);
        return;
      }

      if (isEdit && selectedProductSection) {
        await updateProductSection(selectedProductSection.id, values);
        toast.success("Product section updated successfully");
      } else {
        await createProductSection(values);
        toast.success("Product section created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product Section" : "Create Product Section"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product section details below."
              : "Register a new product section to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="section_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Section Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Aisle A, North Shelf, Cold Storage" {...field} />
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
                      placeholder="Enter a brief description of the product section..." 
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
                {isEdit ? "Save Changes" : "Create Product Section"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
