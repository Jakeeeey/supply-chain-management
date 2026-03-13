"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DispatchPlanSummary } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/components/data-table/DispatchPlanColumns";
import { COAOption } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Plus, Trash2, User, Wallet } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const budgetSchema = z.object({
  lines: z.array(
    z.object({
      coa_id: z.number().min(1, "Account is required"),
      remarks: z.string().optional(),
      amount: z.number().min(0.01, "Amount > 0"),
    }),
  ),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DispatchPlanSummary | null;
  coaOptions: COAOption[];
  onSuccess?: () => void;
}

export function BudgetAllocationModal({
  open,
  onOpenChange,
  plan,
  coaOptions,
  onSuccess,
}: BudgetAllocationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const totalBudget = fields.reduce(
    (acc, field, idx) => acc + (form.getValues(`lines.${idx}.amount`) || 0),
    0,
  );

  const onSubmit = async (values: BudgetFormValues) => {
    if (!plan) return;
    setIsSubmitting(true);
    try {
      // In a real app, we'd call an API here.
      // For now, we'll simulate success.
      console.log("Saving budget for plan:", plan.id, values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Budget allocated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Budget Allocation
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Dispatch {plan.dpNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Budget
            </p>
            <p className="text-3xl font-black text-blue-600">
              ₱{totalBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Summary Header Row */}
        <div className="grid grid-cols-5 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
              Encoder
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-3 h-3" />
              </div>
              <span>System Gen</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
              Trip Value
            </p>
            <p className="text-sm font-bold text-slate-700">
              ₱{plan.amount.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
              Duration
            </p>
            <p className="text-sm font-bold text-slate-700">30.0 Hours</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
              Driver
            </p>
            <p className="text-sm font-bold text-slate-700 truncate">
              {plan.driverName}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
              Staff
            </p>
            <p className="text-sm font-bold text-slate-700">+2 Helpers</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-6"
          >
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-[1fr_1fr_150px_48px] px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Account (COA)</span>
                <span>Remarks</span>
                <span className="text-right">Amount</span>
                <span></span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_1fr_150px_48px] gap-3 px-4 py-3 items-center group"
                  >
                    <FormField
                      control={form.control}
                      name={`lines.${index}.coa_id`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(val) => field.onChange(Number(val))}
                            value={
                              field.value ? String(field.value) : undefined
                            }
                          >
                            <FormControl>
                              <SelectTrigger className="bg-transparent border-slate-200 h-10">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {coaOptions.map((coa) => (
                                <SelectItem
                                  key={coa.coa_id}
                                  value={String(coa.coa_id)}
                                >
                                  {coa.account_title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${index}.remarks`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Details..."
                              className="bg-transparent border-slate-200 h-10 text-sm"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="bg-transparent border-slate-200 h-10 text-sm text-right font-bold"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-slate-300 hover:text-red-500 transition-colors"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-300 italic">
                    <Info className="w-5 h-5 mb-2 opacity-20" />
                    <p className="text-sm">No budget lines added yet.</p>
                  </div>
                )}
              </div>

              {/* Add Button Row */}
              <div className="p-4 bg-slate-50/50 flex justify-end items-center gap-4">
                <div className="grid grid-cols-[1fr_1fr_150px_48px] gap-3 w-full opacity-50 pointer-events-none grayscale">
                  <div className="h-10 bg-white border border-slate-200 rounded flex items-center px-3 text-xs text-muted-foreground italic">
                    Quick selection...
                  </div>
                  <div className="h-10 bg-white border border-slate-200 rounded flex items-center px-3 text-xs text-muted-foreground italic">
                    Add details...
                  </div>
                  <div className="h-10 bg-white border border-slate-200 rounded flex items-center px-3 justify-end text-xs font-bold">
                    0.00
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 shrink-0 shadow-none border-none"
                  onClick={() => append({ coa_id: 0, remarks: "", amount: 0 })}
                >
                  <Plus className="w-5 h-5 font-black" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-8 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || fields.length === 0}
                type="submit"
                className="h-11 px-12 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Budget"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
