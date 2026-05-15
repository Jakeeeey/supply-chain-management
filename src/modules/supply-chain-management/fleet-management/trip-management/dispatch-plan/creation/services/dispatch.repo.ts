// ─── Dispatch Creation Module — Repository Layer ────────────
// Generic CRUD operations for Directus I/O.
// Consumed only by dispatch.service.ts.

import type {
  DirectusSingleResponse,
  PlanHeaderPayload,
  PostDispatchJunctionRow,
  PostDispatchPlanRow,
  UpdateHeaderPayload,
} from "../types/dispatch.types";
import { request, API_BASE_URL } from "./api";

const BASE_URL = API_BASE_URL?.replace(/\/$/, "");

// ─── Generic CRUD Operations ────────────────────────────────

/**
 * Performs a batch POST request to a Directus collection.
 * Inserts multiple rows in a single HTTP call.
 */
export async function batchCreate<T>(
  collection: string,
  payloads: T[],
): Promise<void> {
  if (!payloads.length) return;
  await request(`${BASE_URL}/items/${collection}`, {
    method: "POST",
    body: JSON.stringify(payloads),
  });
}

/**
 * Deletes multiple rows from a Directus collection by their IDs.
 */
export async function deleteByIds(
  collection: string,
  ids: number[],
): Promise<void> {
  if (!ids.length) return;
  await request(`${BASE_URL}/items/${collection}`, {
    method: "DELETE",
    body: JSON.stringify(ids),
  });
}

/**
 * Fetches only the `id` column from a collection matching a filter.
 * Useful for the "clear then re-insert" pattern.
 */
export async function fetchIdsByFilter(
  collection: string,
  filterKey: string,
  filterValue: string | number,
): Promise<number[]> {
  const data = await request<{ data: { id: number }[] }>(
    `${BASE_URL}/items/${collection}?filter[${filterKey}][_eq]=${filterValue}&fields=id`,
  );
  return (data.data || []).map((r) => r.id);
}

// ─── Plan Header CRUD ───────────────────────────────────────

/**
 * Creates a new post-dispatch plan header row and returns the full response.
 */
export async function createPlanHeader(
  payload: PlanHeaderPayload,
): Promise<DirectusSingleResponse<PostDispatchPlanRow>> {
  return request<DirectusSingleResponse<PostDispatchPlanRow>>(`${BASE_URL}/items/post_dispatch_plan`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Updates an existing post-dispatch plan header.
 */
export async function updatePlanHeader(
  planId: number,
  payload: UpdateHeaderPayload,
): Promise<void> {
  await request(`${BASE_URL}/items/post_dispatch_plan/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ─── Status Updates ─────────────────────────────────────────

/**
 * Updates the status field on a `dispatch_plan` (Pre-Dispatch Plan) row.
 */
export async function updateDispatchPlanStatus(
  pdpId: number,
  status: string,
): Promise<void> {
  await request(`${BASE_URL}/items/dispatch_plan/${pdpId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Updates the `inventory_status` field on a `purchase_order` row.
 * Status 11 = "Picked" (available), Status 12 = "En Route" (dispatched).
 */
export async function updatePurchaseOrderStatus(
  poId: number,
  inventoryStatus: number,
): Promise<void> {
  await request(`${BASE_URL}/items/purchase_order/${poId}`, {
    method: "PATCH",
    body: JSON.stringify({ inventory_status: inventoryStatus }),
  });
}

// ─── Junction Table ─────────────────────────────────────────

export async function fetchJunctionsByPlanId(
  planId: number,
): Promise<PostDispatchJunctionRow[]> {
  const data = await request<{ data: PostDispatchJunctionRow[] }>(
    `${BASE_URL}/items/post_dispatch_dispatch_plans?filter[post_dispatch_plan_id][_eq]=${planId}`,
  );
  return data.data || [];
}

/**
 * Updates an existing junction record.
 */
export async function updateJunction(
  junctionId: number,
  payload: Partial<PostDispatchJunctionRow>,
): Promise<void> {
  await request(`${BASE_URL}/items/post_dispatch_dispatch_plans/${junctionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Creates a new junction record.
 */
export async function createJunction(
  payload: Omit<PostDispatchJunctionRow, "id">,
): Promise<void> {
  await request(`${BASE_URL}/items/post_dispatch_dispatch_plans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Re-exports from specialized repository files ───────────
// Preserves backward compatibility for `import * as repo from "./dispatch.repo"`

export { fetchMasterData, fetchPurchaseOrders } from "./master-data.repo";
export { fetchApprovedPreDispatchPlans } from "./pdp-enrichment.repo";
export {
  fetchPostDispatchPlanDetails,
  fetchPlanDetails,
  fetchAllBudgets,
  fetchPlanBudgets,
  fetchPdpInvoiceIds,
} from "./plan-details.repo";
