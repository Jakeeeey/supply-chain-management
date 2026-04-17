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
  Switch,
} from "../lib/ui";
import { Loader2, Boxes } from "lucide-react";

import { RTSReturnType } from "../types";
import { rtsReturnTypeSchema, RTSReturnTypeFormValues } from "../schema";
import { createRTSReturnType, updateRTSReturnType } from "../providers/fetchProviders";

interface RTSReturnTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: RTSReturnType | null;
  onSuccess: () => void;
  existingData: RTSReturnType[];
}

export function RTSReturnTypeDialog({
  open,
  onOpenChange,
  selectedType,
  onSuccess,
  existingData,
}: RTSReturnTypeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!selectedType;

  // Specify the form generic strictly
  const form = useForm<RTSReturnTypeFormValues>({
    resolver: zodResolver(rtsReturnTypeSchema),
    defaultValues: {
      return_type_code: "",
      return_type_name: "",
      description: "",
      isActive: true,
    },
  });
  // Watch name and code for duplicate checks
  const typeName = form.watch("return_type_name");
  const typeCode = form.watch("return_type_code");

  const isDuplicateName = !!typeName && existingData.some(item => 
    item.return_type_name.trim().toLowerCase() === typeName.trim().toLowerCase() && 
    item.id !== selectedType?.id
  );

  const isDuplicateCode = !!typeCode && existingData.some(item => 
    item.return_type_code.trim().toUpperCase() === typeCode.trim().toUpperCase() && 
    item.id !== selectedType?.id
  );

  useEffect(() => {
    if (open) {
      if (selectedType) {
        form.reset({
          return_type_code: selectedType.return_type_code,
          return_type_name: selectedType.return_type_name,
          description: selectedType.description || "",
          isActive: !!selectedType.isActive,
        });
      } else {
        form.reset({
          return_type_code: "",
          return_type_name: "",
          description: "",
          isActive: true,
        });
      }
    }
  }, [open, selectedType, form]);

  const onSubmit = async (values: RTSReturnTypeFormValues) => {
    try {
      setLoading(true);
      if (isEditing && selectedType) {
        await updateRTSReturnType(selectedType.id, values);
        toast.success("RTS return type updated successfully");
      } else {
        await createRTSReturnType(values);
        toast.success("RTS return type created successfully");
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
                {isEditing ? "Edit Return Type" : "New Return Type"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing 
                    ? "Update the details for this return category." 
                    : "Define a new category for supplier returns."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
            <FormField
              control={form.control}
              name="return_type_name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Damaged Goods"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="return_type_code"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</FormLabel>
                    <FormControl>
                      <Input
                      placeholder="e.g. DMG"
                      className={`bg-muted/20 focus-visible:ring-primary/30 transition-all hover:bg-muted/40 h-10 rounded-lg ${isDuplicateCode ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : "border-input"}`}
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  {isDuplicateCode ? (
                   <p className="text-[11px] font-semibold text-red-500 mt-1.5 ml-0.5">
                      This return type code is already in use
                   </p>
                  ) : (
                    <FormMessage className="text-[10px]" />
                  )}
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2 h-10 px-3 bg-muted/20 rounded-lg border">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                        <span className="text-xs font-medium">
                          {field.value ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional details..."
                      className="min-h-[100px] bg-muted/20 border-input focus-visible:ring-primary/30 transition-all hover:bg-muted/40 resize-none rounded-lg p-3"
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
                disabled={loading || isDuplicateName || isDuplicateCode} 
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
