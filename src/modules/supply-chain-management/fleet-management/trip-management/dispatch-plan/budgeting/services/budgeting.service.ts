import * as repo from "../../creation/services/dispatch.repo";

/**
 * Replaces all budget lines for a given post-dispatch plan.
 * Follows a clear-and-reinsert pattern to ensure alignment.
 */
export async function updateBudgets(
  planId: number,
  budgets?: { coa_id: number; amount: number; remarks?: string }[],
): Promise<{ success: true }> {
  const existingIds = await repo.fetchIdsByFilter(
    "post_dispatch_budgeting",
    "post_dispatch_plan_id",
    planId,
  );

  await repo.deleteByIds("post_dispatch_budgeting", existingIds);

  if (budgets && budgets.length > 0) {
    const budgetPayloads = budgets.map((b) => ({
      post_dispatch_plan_id: planId,
      coa_id: b.coa_id,
      amount: b.amount,
      remarks: b.remarks,
    }));
    await repo.batchCreate("post_dispatch_budgeting", budgetPayloads);
  }

  return { success: true };
}
