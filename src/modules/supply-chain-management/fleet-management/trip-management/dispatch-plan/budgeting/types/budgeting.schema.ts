import { z } from "zod";

export const BudgetLineSchema = z.object({
  coa_id: z.number().min(1, "Chart of Account is required"),
  amount: z.number().min(0, "Amount cannot be negative"),
  remarks: z.string().optional(),
});

export const UpdateBudgetSchema = z.object({
  budgets: z.array(BudgetLineSchema).optional(),
});

export type UpdateBudgetValues = z.infer<typeof UpdateBudgetSchema>;
