"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Button,
} from "../lib/ui";
import { Loader2, Boxes } from "lucide-react";

import { SalesReturnType } from "../types";
import { salesReturnTypeSchema, SalesReturnTypeFormValues } from "../schema";
import { createSalesReturnType, updateSalesReturnType } from "../providers/fetchProviders";

interface SalesReturnTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: SalesReturnType | null;
  onSuccess: () => void;
  existingData: SalesReturnType[];
}

export function SalesReturnTypeDialog({
  open,
  onOpenChange,
  selectedType,
  onSuccess,
  existingData,
}: SalesReturnTypeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!selectedType;

  const form = useForm<SalesReturnTypeFormValues>({
    resolver: zodResolver(salesReturnTypeSchema),
    defaultValues: {
      type_name: "",
      description: "",
    },
  });

  const typeName = form.watch("type_name");

  const isDuplicateName = !!typeName && existingData.some(item => 
    item.type_name.trim().toLowerCase() === typeName.trim().toLowerCase() && 
    item.type_id !== selectedType?.type_id
  );

  useEffect(() => {
    if (open) {
      if (selectedType) {
        form.reset({
          type_name: selectedType.type_name,
          description: selectedType.description || "",
        });
      } else {
        form.reset({
          type_name: "",
          description: "",
        });
      }
    }
  }, [open, selectedType, form]);

  const onSubmit = async (values: SalesReturnTypeFormValues) => {
    try {
      setLoading(true);
      if (isEditing && selectedType) {
        await updateSalesReturnType(selectedType.type_id, values);
        toast.success("Sales return type updated successfully");
      } else {
        await createSalesReturnType(values);
        toast.success("Sales return type created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-muted/40 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing ? "Edit Sales Return Type" : "New Sales Return Type"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage the classification for returned goods.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
            <FormField
              control={form.control}
              name="type_name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Damage, Wrong Item"
                      className={`bg-muted/20 focus-visible:ring-primary/30 transition-all hover:bg-muted/40 h-10 rounded-lg ${isDuplicateName ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : "border-input"}`}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  {isDuplicateName ? (
                    <p className="text-[11px] font-semibold text-red-500 mt-1.5 ml-0.5">
                      This return type name is already in use
                    </p>
                  ) : (
                    <FormMessage className="text-[10px]" />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter optional description..."
                      className="min-h-[120px] bg-muted/20 border-input focus-visible:ring-primary/30 transition-all hover:bg-muted/40 resize-none rounded-lg p-3"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-none rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || isDuplicateName}
                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95 rounded-lg px-8"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
