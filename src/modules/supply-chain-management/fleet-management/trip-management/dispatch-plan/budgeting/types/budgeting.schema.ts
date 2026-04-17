import { z } from "zod";

export const BudgetLineSchema = z.object({
  coa_id: z.number({ message: "Chart of Account is required" }).min(1, "Chart of Account is required"),
  amount: z.number({ message: "Amount is required" }).min(0.01, "Amount must be greater than 0"),
  remarks: z.string().optional(),
});

export const UpdateBudgetSchema = z.object({
  budgets: z.array(BudgetLineSchema).optional(),
});

export type UpdateBudgetValues = z.infer<typeof UpdateBudgetSchema>;
