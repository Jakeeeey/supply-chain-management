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

import { engineTypeSchema, EngineTypeFormValues, EngineTypeApiRow } from "../types";
import { createEngineType, updateEngineType } from "../providers/fetchProviders";

interface EngineTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngineType: EngineTypeApiRow | null;
  onSuccess: () => void;
}

export function EngineTypeDialog({
  open,
  onOpenChange,
  selectedEngineType,
  onSuccess,
}: EngineTypeDialogProps) {
  const isEdit = !!selectedEngineType;

  const form = useForm<EngineTypeFormValues>({
    resolver: zodResolver(engineTypeSchema) as any,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: selectedEngineType?.name || "",
        description: selectedEngineType?.description || "",
      });
    }
  }, [open, selectedEngineType, form]);

  const onSubmit: SubmitHandler<EngineTypeFormValues> = async (values) => {
    try {
      if (isEdit && selectedEngineType) {
        await updateEngineType(selectedEngineType.id, values);
        toast.success("Engine type updated successfully");
      } else {
        await createEngineType(values);
        toast.success("Engine type created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("unique") || error.message?.includes("UNIQUE")) {
        toast.error("This engine type name already exists.");
      } else {
        toast.error(error.message || "Something went wrong");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Engine Type" : "Create Engine Type"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update engine type details below."
              : "Register a new engine type to the system."}
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
                    <Input placeholder="e.g. Diesel, Gasoline" {...field} />
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
