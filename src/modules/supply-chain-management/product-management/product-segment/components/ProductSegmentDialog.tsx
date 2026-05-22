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

import { productSegmentSchema, ProductSegmentFormValues, ProductSegmentApiRow } from "../types";
import { createProductSegment, updateProductSegment, checkProductSegmentUniqueness } from "../providers/fetchProviders";

interface ProductSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductSegment: ProductSegmentApiRow | null;
  onSuccess: () => void;
}

export function ProductSegmentDialog({
  open,
  onOpenChange,
  selectedProductSegment,
  onSuccess,
}: ProductSegmentDialogProps) {
  const isEdit = !!selectedProductSegment;

  const form = useForm<ProductSegmentFormValues>({
    resolver: zodResolver(productSegmentSchema),
    defaultValues: {
      segment_name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        segment_name: selectedProductSegment?.segment_name || "",
        description: selectedProductSegment?.description || "",
      });
    }
  }, [open, selectedProductSegment, form]);

  const onSubmit: SubmitHandler<ProductSegmentFormValues> = async (values) => {
    try {
      // 🛡️ Strict Uniqueness Checker
      const nameUnique = await checkProductSegmentUniqueness("segment_name", values.segment_name, selectedProductSegment?.id);
      if (!nameUnique) {
        toast.error(`The Product Segment Name "${values.segment_name}" is already in use.`);
        return;
      }

      if (isEdit && selectedProductSegment) {
        await updateProductSegment(selectedProductSegment.id, values);
        toast.success("Product segment updated successfully");
      } else {
        await createProductSegment(values);
        toast.success("Product segment created successfully");
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
          <DialogTitle>{isEdit ? "Edit Product Segment" : "Create Product Segment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product segment details below."
              : "Register a new product segment to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="segment_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Segment Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Household, Automotive, Sports" {...field} />
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
                      placeholder="Enter a brief description of the product segment..." 
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
                {isEdit ? "Save Changes" : "Create Product Segment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
