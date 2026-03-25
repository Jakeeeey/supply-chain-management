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
  PostDispatchOtherRow,
  PostDispatchPurchaseRow,
} from "../types/dispatch.types";
import type {
  DispatchCreationFormValues,
  UpdateTripValues,
} from "../types/dispatch.schema";

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
  currentPlanId?: number | number[],
): Promise<DirectusResponse<EnrichedApprovedPlan>> {
  return repo.fetchApprovedPreDispatchPlans(branchId, currentPlanId);
}

/**
 * Returns enriched plan details (customer, order status, city, amount) for a PDP.
 * When `tripId` is provided, fetches from post_dispatch_invoices instead.
 */
export async function getPlanDetails(
  planIds: number[],
  tripId?: number,
): Promise<DirectusResponse<EnrichedPlanDetail>> {
  return repo.fetchPlanDetails(planIds, tripId);
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

/**
 * Fetches available purchase orders for route stop selection.
 */
export async function getPurchaseOrders(query?: string) {
  return repo.fetchPurchaseOrders(query);
}
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
    dispatch_id: data.pre_dispatch_plan_ids[0],
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

  const junctionPayloads = data.pre_dispatch_plan_ids.map(pdpId => ({
    post_dispatch_plan_id: newPlanId,
    dispatch_plan_id: pdpId,
    linked_at: new Date().toISOString(),
    linked_by: data.driver_id,
  }));

  // Separate sequence into Invoices and Others
  const invoicePayloads: Omit<PostDispatchInvoiceRow, "id">[] = [];
  const othersPayloads: PostDispatchOtherRow[] = [];
  const purchasePayloads: PostDispatchPurchaseRow[] = []; // Added this line

  if (data.invoices && data.invoices.length > 0) {
    data.invoices.forEach((item) => {
      // 1. All items (invoices, manual, PO) go to 'others' for unified sequence display
      othersPayloads.push({
        post_dispatch_plan_id: newPlanId,
        remarks: item.remarks || item.po_no || item.invoice_no || "Stop", // Modified
        distance: item.distance || 0,
        sequence: item.sequence,
        status: item.status || "Not Fulfilled",
      });

      // 2. Only real invoices go into 'post_dispatch_invoices'
      if (!item.isManualStop && !item.isPoStop && item.invoice_id) { // Modified
        invoicePayloads.push({
          post_dispatch_plan_id: newPlanId,
          invoice_id: item.invoice_id,
          invoiceNo: item.invoice_no,
          sequence: item.sequence,
          status: item.status || "Not Fulfilled",
        });
      }

      // 3. Purchase Orders go into 'post_dispatch_purchases'
      if (item.isPoStop && item.po_id) { // Added this block
        purchasePayloads.push({
          post_dispatch_plan_id: newPlanId,
          po_id: item.po_id,
          distance: item.distance || 0,
          sequence: item.sequence,
          status: item.status || "Not Fulfilled",
        });
      }
    });
  } else {
    // Fallback: fetch default sequence from database (only invoices)
    const invoiceIds = await repo.fetchPdpInvoiceIds(data.pre_dispatch_plan_ids);
    invoiceIds.forEach((id, index) => {
      const seq = index + 1;
      invoicePayloads.push({
        post_dispatch_plan_id: newPlanId,
        invoice_id: id,
        sequence: seq,
        status: "Not Fulfilled",
      });
      othersPayloads.push({
        post_dispatch_plan_id: newPlanId,
        remarks: "Invoice", // Will be enriched or replaced by actual invoice mapping later if needed
        distance: 0,
        sequence: seq,
        status: "Not Fulfilled",
      });
    });
  }

  // 3. Batch inserts + status update
  await Promise.all([
    repo.batchCreate("post_dispatch_plan_staff", staffPayloads),
    repo.batchCreate("post_dispatch_dispatch_plans", junctionPayloads),
    repo.batchCreate("post_dispatch_invoices", invoicePayloads),
    repo.batchCreate("post_dispatch_plan_others", othersPayloads),
    repo.batchCreate("post_dispatch_purchases", purchasePayloads), // Added this line
    ...data.pre_dispatch_plan_ids.map(pdpId => repo.updateDispatchPlanStatus(pdpId, "Dispatched")),
  ]);

  return { success: true, id: newPlanId };
}

/**
 * Updates an existing dispatch plan's trip configuration:
 * PDP swap, invoice sync, header update, and staff replacement.
 */
export async function updateTrip(
  planId: number,
  data: UpdateTripValues,
): Promise<{ success: true }> {
  const newPdpIds = data.pre_dispatch_plan_ids;

  // 1. Resolve PDP Swapping
  const junctionRecords = await repo.fetchJunctionsByPlanId(planId);
  const oldPdpIds = junctionRecords.map(j => j.dispatch_plan_id).filter(Boolean) as number[];

  const pdpSwapTasks: Promise<void>[] = [];
  if (newPdpIds) {
    const removedPdpIds = oldPdpIds.filter(id => !newPdpIds.includes(id));
    for (const id of removedPdpIds) {
      pdpSwapTasks.push(repo.updateDispatchPlanStatus(id, "Picked"));
    }
    
    const addedPdpIds = newPdpIds.filter(id => !oldPdpIds.includes(id));
    for (const id of addedPdpIds) {
      pdpSwapTasks.push(repo.updateDispatchPlanStatus(id, "Dispatched"));
    }

    pdpSwapTasks.push((async () => {
      const oldJunctionIds = junctionRecords.map(j => j.id!);
      await repo.deleteByIds("post_dispatch_dispatch_plans", oldJunctionIds);
      
      const newJunctionPayloads = newPdpIds.map(id => ({
        post_dispatch_plan_id: planId,
        dispatch_plan_id: id,
        linked_at: new Date().toISOString(),
        linked_by: data.driver_id,
      }));
      await repo.batchCreate("post_dispatch_dispatch_plans", newJunctionPayloads);
    })());
  }

  // 2. Sync Invoices, Others & Purchases // Modified comment
  const newInvoicePayloads: Omit<PostDispatchInvoiceRow, "id">[] = [];
  const newOthersPayloads: PostDispatchOtherRow[] = [];
  const newPurchasePayloads: PostDispatchPurchaseRow[] = []; // Added this line

  if (data.invoices && data.invoices.length > 0) {
    data.invoices.forEach((item, idx) => {
      const seq = item.sequence || idx + 1;
      
      // All items go to 'others'
      newOthersPayloads.push({
        post_dispatch_plan_id: planId,
        remarks: item.remarks || item.po_no || item.invoice_no || "Stop", // Modified
        distance: item.distance || 0,
        sequence: seq,
        status: item.status || "Not Fulfilled",
      });

      // Only real invoices go to 'post_dispatch_invoices'
      if (!item.isManualStop && !item.isPoStop && item.invoice_id) { // Modified
        newInvoicePayloads.push({
          post_dispatch_plan_id: planId,
          invoice_id: item.invoice_id,
          invoiceNo: item.invoice_no,
          sequence: seq,
          status: item.status || "Not Fulfilled",
        });
      }

      // Purchases go to 'post_dispatch_purchases'
      if (item.isPoStop && item.po_id) { // Added this block
        newPurchasePayloads.push({
          post_dispatch_plan_id: planId,
          po_id: item.po_id,
          distance: item.distance || 0,
          sequence: seq,
          status: item.status || "Not Fulfilled",
        });
      }
    });
  }
 else if (newPdpIds && newPdpIds.length > 0) {
    // Auto-sync from PDPs if no explicit sequence provided
    const invIds = await repo.fetchPdpInvoiceIds(newPdpIds);
    invIds.forEach((id, idx) => {
      const seq = idx + 1;
      newInvoicePayloads.push({
        post_dispatch_plan_id: planId,
        invoice_id: id,
        sequence: seq,
        status: "Not Fulfilled",
      });
      newOthersPayloads.push({
        post_dispatch_plan_id: planId,
        remarks: "Invoice",
        distance: 0,
        sequence: seq,
        status: "Not Fulfilled",
      });
    });
  }

  // Always sync if PDP ids or invoices were provided
  if (newPdpIds || data.invoices) {

    const oldIds = await repo.fetchIdsByFilter(
      "post_dispatch_invoices",
      "post_dispatch_plan_id",
      planId,
    );
    const oldOtherIds = await repo.fetchIdsByFilter(
      "post_dispatch_plan_others",
      "post_dispatch_plan_id",
      planId,
    );
    const oldPurchaseIds = await repo.fetchIdsByFilter(
      "post_dispatch_purchases",
      "post_dispatch_plan_id",
      planId,
    );

    await repo.deleteByIds("post_dispatch_invoices", oldIds);
    await repo.deleteByIds("post_dispatch_plan_others", oldOtherIds);
    await repo.deleteByIds("post_dispatch_purchases", oldPurchaseIds);

    if (newInvoicePayloads.length > 0) {
      await repo.batchCreate("post_dispatch_invoices", newInvoicePayloads);
    }
    if (newOthersPayloads.length > 0) {
      await repo.batchCreate("post_dispatch_plan_others", newOthersPayloads);
    }
    if (newPurchasePayloads.length > 0) {
      await repo.batchCreate("post_dispatch_purchases", newPurchasePayloads);
    }
  }

  // 3. Update Header & Staff
  const headerPayload: any = {
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
    encoder_id: data.encoder_id ?? data.driver_id,
  };

  if (newPdpIds && newPdpIds.length > 0) {
    headerPayload.dispatch_id = newPdpIds[0];
  }

  const staffPayloads = prepareStaffPayload(
    planId,
    data.driver_id,
    data.helpers ?? [],
  );

  await Promise.all([
    repo.updatePlanHeader(planId, headerPayload),
    ...pdpSwapTasks,
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

