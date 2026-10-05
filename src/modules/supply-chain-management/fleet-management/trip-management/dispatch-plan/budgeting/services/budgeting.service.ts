import * as repo from "../../creation/services/dispatch.repo";
import { fetchItems } from "../../creation/services/api";

export interface FuelAllocationRow {
  id?: number;
  doc_no?: string;
  dispatch_id?: number;
  user_id?: number;
  liter?: number;
}

/**
 * Fetches existing fuel allocation for a given post-dispatch plan ID.
 */
export async function getFuelAllocation(
  planId: number,
): Promise<FuelAllocationRow | null> {
  const items = await fetchItems<FuelAllocationRow>(
    "/items/user_fuel_allocation",
    {
      "filter[dispatch_id][_eq]": planId,
      fields: "*",
      limit: 1,
    },
  );
  return items.data?.[0] || null;
}

/**
 * Replaces all budget lines and fuel allocation for a given post-dispatch plan.
 * Follows a clear-and-reinsert pattern to ensure alignment.
 */
export async function updateBudgets(
  planId: number,
  budgets?: { coa_id: number; amount: number; remarks?: string }[],
  fuelLiter?: number | null,
  currentUserId?: number,
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

  // Manage user_fuel_allocation
  const existingFuelIds = await repo.fetchIdsByFilter(
    "user_fuel_allocation",
    "dispatch_id",
    planId,
  );
  const isExisting = existingFuelIds.length > 0;
  await repo.deleteByIds("user_fuel_allocation", existingFuelIds);

  if (fuelLiter !== undefined && fuelLiter !== null && Number(fuelLiter) > 0) {
    const planDetails = await repo.fetchPostDispatchPlanDetails(planId);

    let driverUserId: number | null = null;
    if (planDetails.driver_id) {
      const userRes = await fetchItems<{ user_id: number; user_position: string }>("/items/user", {
        "filter[user_id][_eq]": planDetails.driver_id,
        fields: "user_id,user_position",
        limit: 1,
      });
      const driverUser = userRes.data?.[0];
      if (driverUser && (driverUser.user_position?.toLowerCase() === "driver" || driverUser.user_position === "Driver")) {
        driverUserId = driverUser.user_id;
      }
    }

    await repo.batchCreate("user_fuel_allocation", [
      {
        doc_no: planDetails.doc_no || null,
        dispatch_id: planId,
        user_id: driverUserId,
        liter: Number(fuelLiter),
        created_by: currentUserId || null,
        updated_by: isExisting ? (currentUserId || null) : null,
      },
    ]);
  }


  return { success: true };
}

