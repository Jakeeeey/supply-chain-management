"use client";

import { useWatch, UseFormReturn } from "react-hook-form";
import { Plus, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AreaCombobox as Combobox } from "./AreaCombobox";
import { ClusterFormValues, COAOption } from "../types";
import { cn } from "@/lib/utils";

interface CoaBudgetStepProps {
  form: UseFormReturn<ClusterFormValues>;
  coaList: COAOption[];
  fields: Record<"id", string>[];
  append: (value: { coa_id: number; budget: number }) => void;
  remove: (index: number) => void;
}

const selectBase = "h-9 bg-background border-input transition-all";
const selectFocus =
  "outline-none focus:outline-none " +
  "focus:ring-2 focus:ring-ring focus:ring-offset-0 " +
  "focus:border-ring";

export function CoaBudgetStep({
  form,
  coaList,
  fields,
  append,
  remove,
}: CoaBudgetStepProps) {
  const watchedBudgets = useWatch({
    control: form.control,
    name: "coa_budgets",
  }) || [];

  const totalAllocated = watchedBudgets.reduce(
    (sum, item) => sum + (Number(item?.budget) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-primary" />
            Chart of Accounts & Budget Allocation
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign budgets to specific Chart of Accounts for this cluster.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ coa_id: 0, budget: 0 })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Account
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground space-y-2">
          <p className="text-sm">No accounts added yet.</p>
          <p className="text-xs">
            Click &quot;Add Account&quot; to assign a budget to a Chart of Account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const currentSelectedCoaId = watchedBudgets[index]?.coa_id;
            // Prevent selecting already selected accounts in other rows
            const otherSelectedCoaIds = new Set(
              watchedBudgets
                .map((b, i) => (i !== index ? Number(b?.coa_id) : null))
                .filter(Boolean)
            );

            const availableOptions = coaList.filter(
              (c) =>
                !otherSelectedCoaIds.has(c.coa_id) ||
                c.coa_id === currentSelectedCoaId
            );

            return (
              <div
                key={field.id}
                className="rounded-lg border p-3 bg-card space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Account #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* COA Selection */}
                  <FormField<ClusterFormValues>
                    control={form.control}
                    name={`coa_budgets.${index}.coa_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Chart of Account <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            options={availableOptions.map((c) => ({
                              value: String(c.coa_id),
                              label: `${c.gl_code ? `${c.gl_code} - ` : ""}${c.account_title}`,
                            }))}
                            value={field.value ? String(field.value) : ""}
                            onValueChange={(val) => {
                              field.onChange(val ? Number(val) : 0);
                              form.clearErrors(`coa_budgets.${index}.coa_id`);
                            }}
                            placeholder="Select Chart of Account"
                            className={cn(selectBase, selectFocus)}
                            error={!!form.formState.errors.coa_budgets?.[index]?.coa_id}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Budget Input */}
                  <FormField<ClusterFormValues>
                    control={form.control}
                    name={`coa_budgets.${index}.budget`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Budget Amount (PHP) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={(field.value as number) ?? 0}
                            onChange={(e) => {
                              field.onChange(e.target.valueAsNumber || 0);
                              form.clearErrors(`coa_budgets.${index}.budget`);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fields.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">
            Total Allocated Budget:
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            PHP{" "}
            {totalAllocated.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
