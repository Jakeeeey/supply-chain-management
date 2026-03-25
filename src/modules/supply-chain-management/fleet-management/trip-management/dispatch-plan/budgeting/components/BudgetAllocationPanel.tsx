import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Hash,
  Loader2,
  Plus,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DispatchPlanSummary } from "../../creation/components/data-table/index";
import { Combobox } from "../../creation/components/shared/Combobox";
import {
  UpdateBudgetSchema,
  UpdateBudgetValues,
} from "../types/budgeting.schema";

interface BudgetAllocationPanelProps {
  plan: DispatchPlanSummary | null;
  coaOptions: { coa_id: number; account_title: string; gl_code: string }[];
  onSave: (
    budgets: { coa_id: number; amount: number; remarks?: string }[],
  ) => Promise<void>;
  isSubmitting: boolean;
  fetchPlanBudgets: (planId: number) => Promise<any[]>;
  onClearSelection: () => void;
}

export function BudgetAllocationPanel({
  plan,
  coaOptions,
  onSave,
  isSubmitting,
  fetchPlanBudgets,
  onClearSelection,
}: BudgetAllocationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateBudgetValues>({
    resolver: zodResolver(UpdateBudgetSchema),
    defaultValues: { budgets: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "budgets",
  });

  useEffect(() => {
    if (!plan) {
      form.reset({ budgets: [] });
      return;
    }

    const loadBudgets = async () => {
      setIsLoading(true);
      try {
        const budgets = await fetchPlanBudgets(Number(plan.id));
        if (budgets.length > 0) {
          form.reset({
            budgets: budgets.map((b: any) => ({
              coa_id: b.coa_id,
              amount: Number(b.amount),
              remarks: b.remarks || "",
            })),
          });
        } else {
          form.reset({ budgets: [{ coa_id: 0, amount: 0, remarks: "" }] });
        }
      } catch (err: any) {
        toast.error("Failed to fetch existing budgets");
        form.reset({ budgets: [{ coa_id: 0, amount: 0, remarks: "" }] });
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgets();
  }, [plan, form, fetchPlanBudgets]);

  const onSubmit = async (data: UpdateBudgetValues) => {
    if (!plan) return;
    try {
      await onSave(data.budgets || []);
      toast.success("Budgets successfully updated.");
    } catch (err) {
      toast.error("Failed to save budget allocation.");
    }
  };

  if (!plan) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <div className="px-6 pt-4 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 text-primary/40 mb-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="w-7 h-7 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Separator orientation="vertical" className="h-8 self-center opacity-20" />
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="w-7 h-7 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 relative">
          <div className="absolute inset-x-6 top-5 space-y-4 opacity-10 pointer-events-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-border/50 space-y-3">
                <div className="grid grid-cols-[1fr_140px_1fr_36px] gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="grid grid-cols-[1fr_140px_1fr_36px] gap-3 items-center">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="z-10 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
              <Truck className="w-8 h-8 opacity-40 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground/70 tracking-tight">
              No dispatched plan schedule
            </p>
            <p className="text-sm text-muted-foreground mt-1 px-8 max-w-xs mx-auto">
              Select a plan from the sidebar list to allocate budgets and manage expenses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const grandTotal =
    form
      .watch("budgets")
      ?.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="absolute top-3 right-3 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Header */}
      <div className="px-6 pt-4 pb-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Wallet className="w-4 h-4" />
          <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
            Allocate Budget
          </h2>
        </div>

        <div className="flex items-start gap-6">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Dispatch Plan
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {plan.dpNumber}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8 self-center" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Driver
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {plan.driverName}
              </p>
            </div>
          </div>

          <div className="ml-auto">
            <Badge variant="outline" className="text-[10px] font-semibold">
              {fields.length}/{5} lines
            </Badge>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border/50 bg-muted/5 space-y-3"
              >
                {/* Column headers row */}
                <div className="grid grid-cols-[1fr_140px_1fr_36px] gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <div />
                </div>
                {/* Input row */}
                <div className="grid grid-cols-[1fr_140px_1fr_36px] gap-3 items-center">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form
              id="budget-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
            >
              {/* Column header labels — shown once above the rows */}
              {fields.length > 0 && (
                <div className="grid grid-cols-[1fr_140px_1fr_36px] gap-3 px-4">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Expense Account
                  </span>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Amount (₱)
                  </span>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Remarks{" "}
                    <span className="font-normal text-muted-foreground/50">
                      (Optional)
                    </span>
                  </span>
                  <div />
                </div>
              )}

              {/* Budget rows */}
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_140px_1fr_36px] gap-3 items-start p-4 rounded-lg border border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors group"
                  >
                    {/* Expense Account */}
                    <FormField
                      control={form.control}
                      name={`budgets.${index}.coa_id`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Combobox
                              options={coaOptions.map((c) => ({
                                value: String(c.coa_id),
                                label: c.account_title,
                              }))}
                              value={String(field.value)}
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              placeholder="Select account"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name={`budgets.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="font-medium tabular-nums text-right h-9"
                              value={field.value || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                field.onChange(val < 0 ? 0 : val);
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {/* Remarks */}
                    <FormField
                      control={form.control}
                      name={`budgets.${index}.remarks`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <Input
                              placeholder="Notes..."
                              className="h-9"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {/* Delete */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <Button
                type="button"
                onClick={() => append({ coa_id: 0, amount: 0, remarks: "" })}
                variant="outline"
                className="w-full border-dashed h-10 text-muted-foreground hover:text-foreground hover:border-border mt-1"
                disabled={fields.length >= 5}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Budget Line
              </Button>

              {fields.length >= 5 && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-destructive text-xs font-semibold">
                    Maximum Limit Reached
                  </AlertTitle>
                  <AlertDescription className="text-destructive/80 text-[10px]">
                    You can only add up to 5 budget lines per dispatch plan.
                    Please consolidate expenses if necessary.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border/60 bg-muted/5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">
            Total Allocated
          </p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            ₱
            {grandTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <Button
          type="submit"
          form="budget-form"
          disabled={isSubmitting || isLoading}
          className="px-6 h-9 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Budget"
          )}
        </Button>
      </div>
    </div>
  );
}
