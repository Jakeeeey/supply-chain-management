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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services";
import { DispatchPlanSummary } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/components/data-table/columns";
import { COAOption } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Loader2, Plus, Trash2, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
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
    defaultValues: { lines: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = form.watch("lines");
  const totalBudget = watchedLines.reduce(
    (acc, line) => acc + (Number(line.amount) || 0),
    0,
  );

  // Fetch existing budgets when modal opens
  useEffect(() => {
    if (open && plan?.id) {
      const fetchBudgets = async () => {
        try {
          const res = await fetch(
            `/api/scm/fleet-management/trip-management/dispatch-creation?type=plan_budgets&plan_id=${plan.id}`,
          );
          const result = await res.json();
          if (result.data) {
            form.reset({ lines: result.data });
          }
        } catch {
          toast.error("Failed to load existing budgets");
        }
      };
      fetchBudgets();
    }
  }, [open, plan, form]);

  const onSubmit = async (values: BudgetFormValues) => {
    if (!plan?.id) return;
    setIsSubmitting(true);
    try {
      await dispatchCreationLifecycleService.updateBudget(
        Number(plan.id),
        values.lines,
      );
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
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 border border-border/60 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
                  Budget Allocation
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.dpNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Total Budget
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight transition-colors",
                  totalBudget > 0
                    ? "text-foreground"
                    : "text-muted-foreground/40",
                )}
              >
                ₱
                {totalBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Trip meta strip */}
        <div className="px-6 py-3 bg-muted/20 border-b border-border/40 flex items-center gap-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Trip Value
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              ₱
              {Number(plan.amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Duration
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                30.0 hrs
              </p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Driver
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5 max-w-[120px] truncate">
              {plan.driverName}
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Crew
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                +2 helpers
              </p>
            </div>
          </div>
        </div>

        {/* Budget Lines */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 py-4">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_130px_36px] gap-3 px-1 mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Account (COA)
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Remarks
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Amount
                </p>
                <span />
              </div>

              {/* Lines */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 border border-dashed border-border/60 rounded-lg bg-muted/10">
                    <Wallet className="w-6 h-6 mb-2 opacity-30" />
                    <p className="text-xs">
                      No budget lines yet. Add one below.
                    </p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_1fr_130px_36px] gap-3 items-center group"
                    >
                      <FormField
                        control={form.control}
                        name={`lines.${index}.coa_id`}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              value={
                                field.value ? String(field.value) : undefined
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select account..." />
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
                                placeholder="Optional note..."
                                className="h-8 text-xs"
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
                                placeholder="0.00"
                                className="h-8 text-xs text-right font-semibold"
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
                        className="h-8 w-8 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Add line */}
              <button
                type="button"
                onClick={() => append({ coa_id: 0, remarks: "", amount: 0 })}
                className="mt-3 w-full flex items-center justify-center gap-2 h-8 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add line
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {fields.length === 0
                  ? "Add at least one budget line to save."
                  : `${fields.length} line${fields.length > 1 ? "s" : ""} · ₱${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })} total`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 px-4 text-sm font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || fields.length === 0}
                  className="h-8 px-4 text-sm font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Budget"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
