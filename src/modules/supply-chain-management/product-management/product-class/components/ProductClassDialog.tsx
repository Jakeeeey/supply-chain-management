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

import { productClassSchema, ProductClassFormValues, ProductClassApiRow } from "../types";
import { createProductClass, updateProductClass, checkProductClassUniqueness } from "../providers/fetchProviders";

interface ProductClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductClass: ProductClassApiRow | null;
  onSuccess: () => void;
}

export function ProductClassDialog({
  open,
  onOpenChange,
  selectedProductClass,
  onSuccess,
}: ProductClassDialogProps) {
  const isEdit = !!selectedProductClass;

  const form = useForm<ProductClassFormValues>({
    resolver: zodResolver(productClassSchema),
    defaultValues: {
      class_name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        class_name: selectedProductClass?.class_name || "",
        description: selectedProductClass?.description || "",
      });
    }
  }, [open, selectedProductClass, form]);

  const onSubmit: SubmitHandler<ProductClassFormValues> = async (values) => {
    try {
      // 🛡️ Strict Uniqueness Checker
      const nameUnique = await checkProductClassUniqueness("class_name", values.class_name, selectedProductClass?.id);
      if (!nameUnique) {
        toast.error(`The Product Class Name "${values.class_name}" is already in use.`);
        return;
      }

      if (isEdit && selectedProductClass) {
        await updateProductClass(selectedProductClass.id, values);
        toast.success("Product class updated successfully");
      } else {
        await createProductClass(values);
        toast.success("Product class created successfully");
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
          <DialogTitle>{isEdit ? "Edit Product Class" : "Create Product Class"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product class details below."
              : "Register a new product class to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="class_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Class Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Raw Materials, Finished Goods" {...field} />
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
                      placeholder="Enter a brief description of the product class..." 
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
                {isEdit ? "Save Changes" : "Create Product Class"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
