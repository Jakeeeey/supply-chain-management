// ─── Dispatch Creation Module — Service Layer ───────────────
// Business logic and orchestration ONLY.
// Calls repo methods — never calls fetch() directly.

import {
  generateDispatchNo,
  prepareStaffPayload,
} from "./dispatch.helpers";
import * as repo from "./dispatch.repo";
import type {
  DispatchCreationMasterData,
  DirectusResponse,
  EnrichedApprovedPlan,
  EnrichedPlanDetail,
  PlanHeaderPayload,
  PostDispatchBudgetRow,
  PostDispatchPlanDetails,
  PostDispatchInvoiceRow,
} from "../types/dispatch.types";
import type {
  DispatchCreationFormValues,
  UpdateTripValues,
} from "../types/dispatch.schema";

// ─── GET Operations ─────────────────────────────────────────

/**
 * Returns all master-data lookups (drivers, helpers, vehicles, branches, COA).
 */
export async function getMasterData(): Promise<DispatchCreationMasterData> {
  return repo.fetchMasterData();
}

/**
 * Returns approved Pre-Dispatch Plans available for dispatch,
 * optionally filtered by branch.
 */
export async function getApprovedPlans(
  branchId?: number,
  currentPlanId?: number,
): Promise<DirectusResponse<EnrichedApprovedPlan>> {
  return repo.fetchApprovedPreDispatchPlans(branchId, currentPlanId);
}

/**
 * Returns enriched plan details (customer, order status, city, amount) for a PDP.
 * When `tripId` is provided, fetches from post_dispatch_invoices instead.
 */
export async function getPlanDetails(
  planId: number,
  tripId?: number,
): Promise<DirectusResponse<EnrichedPlanDetail>> {
  return repo.fetchPlanDetails(planId, tripId);
}

/**
 * Returns all budget rows across every plan (for summary table enrichment).
 */
export async function getBudgetSummary(): Promise<PostDispatchBudgetRow[]> {
  return repo.fetchAllBudgets();
}

/**
 * Returns budget rows for a specific plan.
 */
export async function getPlanBudgets(
  planId: number,
): Promise<PostDispatchBudgetRow[]> {
  return repo.fetchPlanBudgets(planId);
}

/**
 * Returns full post-dispatch plan details including staff and linked PDP.
 */
export async function getPostPlanDetails(
  planId: number,
): Promise<PostDispatchPlanDetails> {
  return repo.fetchPostDispatchPlanDetails(planId);
}

// ─── POST — Create Dispatch Plan ────────────────────────────

/**
 * Creates a complete dispatch plan: header + staff + junction + budgets + invoices.
 * Also marks the source Pre-Dispatch Plan as "Dispatched".
 *
 * Returns the new plan ID.
 */
export async function createDispatchPlan(
  data: DispatchCreationFormValues,
): Promise<{ success: true; id: number }> {
  // 1. Insert plan header
  const planPayload: PlanHeaderPayload = {
    doc_no: generateDispatchNo(),
    dispatch_id: data.pre_dispatch_plan_id,
    driver_id: data.driver_id,
    vehicle_id: data.vehicle_id,
    starting_point: data.starting_point,
    status: "For Approval",
    amount: data.amount,
    // encoder_id falls back to driver_id when no explicit encoder is provided.
    // This is the default behavior because the driver is typically the one encoding the dispatch.
    encoder_id: data.encoder_id ?? data.driver_id,
    estimated_time_of_dispatch: new Date(
      data.estimated_time_of_dispatch,
    ).toISOString(),
    estimated_time_of_arrival: new Date(
      data.estimated_time_of_arrival,
    ).toISOString(),
    remarks: data.remarks,
  };

  const planDoc = await repo.createPlanHeader(planPayload);
  const newPlanId = planDoc.data.id;

  // 2. Prepare sub-payloads
  const staffPayloads = prepareStaffPayload(
    newPlanId,
    data.driver_id,
    data.helpers ?? [],
  );

  const junctionPayload = {
    post_dispatch_plan_id: newPlanId,
    dispatch_plan_id: data.pre_dispatch_plan_id,
    linked_at: new Date().toISOString(),
    linked_by: data.driver_id,
  };

  const budgetPayloads = (data.budgets ?? []).map((b) => ({
    post_dispatch_plan_id: newPlanId,
    coa_id: b.coa_id,
    amount: b.amount,
    remarks: b.remarks,
  }));

  const invoiceIds = await repo.fetchPdpInvoiceIds(
    data.pre_dispatch_plan_id,
  );
  const invoicePayloads: Omit<PostDispatchInvoiceRow, "id">[] = invoiceIds.map(
    (id, index) => ({
      post_dispatch_plan_id: newPlanId,
      invoice_id: id,
      sequence: index + 1,
      status: "Not Fulfilled",
    }),
  );

  // 3. Batch inserts + status update
  // ⚠️ Not atomic — if one fails, previously resolved inserts are not rolled back
  await Promise.all([
    repo.batchCreate("post_dispatch_plan_staff", staffPayloads),
    repo.batchCreate("post_dispatch_dispatch_plans", [junctionPayload]),
    repo.batchCreate("post_dispatch_budgeting", budgetPayloads),
    repo.batchCreate("post_dispatch_invoices", invoicePayloads),
    repo.updateDispatchPlanStatus(data.pre_dispatch_plan_id, "Dispatched"),
  ]);

  return { success: true, id: newPlanId };
}

// ─── PATCH — Update Trip ────────────────────────────────────

/**
 * Updates an existing dispatch plan's trip configuration:
 * PDP swap, invoice sync, header update, and staff replacement.
 */
export async function updateTrip(
  planId: number,
  data: UpdateTripValues,
): Promise<{ success: true }> {
  const newPdpId = data.pre_dispatch_plan_id;

  // 1. Resolve PDP Swapping
  const junctionRecord = await repo.fetchJunctionByPlanId(planId);
  const oldPdpId = junctionRecord?.dispatch_plan_id;

  const pdpSwapTasks: Promise<void>[] = [];
  if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
    pdpSwapTasks.push(
      repo.updateDispatchPlanStatus(oldPdpId, "Picked"),
      repo.updateDispatchPlanStatus(newPdpId, "Dispatched"),
      repo.updateJunction(junctionRecord!.id!, {
        dispatch_plan_id: newPdpId,
        linked_by: data.driver_id,
      }),
    );
  } else if (newPdpId && !oldPdpId) {
    pdpSwapTasks.push(
      repo.updateDispatchPlanStatus(newPdpId, "Dispatched"),
      repo.createJunction({
        post_dispatch_plan_id: planId,
        dispatch_plan_id: newPdpId,
        linked_at: new Date().toISOString(),
        linked_by: data.driver_id,
      }),
    );
  }

  // 2. Sync Invoices
  let newInvoicePayloads: Omit<PostDispatchInvoiceRow, "id">[] = [];
  if (data.invoices && data.invoices.length > 0) {
    newInvoicePayloads = data.invoices.map((inv, idx) => ({
      post_dispatch_plan_id: planId,
      invoice_id: inv.invoice_id,
      sequence: inv.sequence || idx + 1,
      status: "Not Fulfilled",
    }));
  } else if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
    const invIds = await repo.fetchPdpInvoiceIds(newPdpId);
    newInvoicePayloads = invIds.map((id, idx) => ({
      post_dispatch_plan_id: planId,
      invoice_id: id,
      sequence: idx + 1,
      status: "Not Fulfilled",
    }));
  }

  if (newInvoicePayloads.length > 0) {
    const oldIds = await repo.fetchIdsByFilter(
      "post_dispatch_invoices",
      "post_dispatch_plan_id",
      planId,
    );
    await repo.deleteByIds("post_dispatch_invoices", oldIds);
    await repo.batchCreate("post_dispatch_invoices", newInvoicePayloads);
  }

  // 3. Update Header & Staff
  const headerPayload = {
    dispatch_id: newPdpId,
    driver_id: data.driver_id,
    vehicle_id: data.vehicle_id,
    starting_point: data.starting_point,
    estimated_time_of_dispatch: new Date(
      data.estimated_time_of_dispatch,
    ).toISOString(),
    estimated_time_of_arrival: new Date(
      data.estimated_time_of_arrival,
    ).toISOString(),
    remarks: data.remarks,
    amount: data.amount,
    // encoder_id falls back to driver_id when no explicit encoder is provided.
    encoder_id: data.encoder_id ?? data.driver_id,
  };

  const staffPayloads = prepareStaffPayload(
    planId,
    data.driver_id,
    data.helpers ?? [],
  );

  // ⚠️ Not atomic — if one fails, previously resolved inserts are not rolled back
  await Promise.all([
    repo.updatePlanHeader(planId, headerPayload),
    ...pdpSwapTasks,
    // Staff replacement (Clear then Add)
    (async () => {
      const staffIds = await repo.fetchIdsByFilter(
        "post_dispatch_plan_staff",
        "post_dispatch_plan_id",
        planId,
      );
      await repo.deleteByIds("post_dispatch_plan_staff", staffIds);
      await repo.batchCreate("post_dispatch_plan_staff", staffPayloads);
    })(),
  ]);

  return { success: true };
}

// ─── PATCH — Update Budgets ─────────────────────────────────

/**
 * Replaces all budget lines for a plan (delete-then-reinsert pattern).
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
