// ─── Dispatch Creation Module — Repository Layer ────────────
// ALL Directus I/O lives here. No business logic.
// Consumed only by dispatch.service.ts.

import { fetchItems } from "./api";
import { directusHeaders, getDirectusBaseUrl } from "./dispatch.helpers";
import type {
  BranchOption,
  ClusterRow,
  COAOption,
  CustomerRow,
  DirectusResponse,
  DirectusSingleResponse,
  DispatchCreationMasterData,
  DispatchPlanDetailRow,
  DriverOption,
  EnrichedApprovedPlan,
  EnrichedPlanDetail,
  HelperOption,
  PlanHeaderPayload,
  PostDispatchBudgetRow,
  PostDispatchInvoiceRow,
  PostDispatchJunctionRow,
  PostDispatchPlanDetails,
  PostDispatchPlanRow,
  PostDispatchStaffRow,
  RawDispatchPlan,
  RawSalesInvoice,
  RawSalesOrder,
  UpdateHeaderPayload,
  VehicleOption,
} from "../types/dispatch.types";

const READY_STATUSES = ["For Loading", "On Hold"];

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
  const res = await fetch(`${getDirectusBaseUrl()}/items/${collection}`, {
    method: "POST",
    headers: directusHeaders(),
    body: JSON.stringify(payloads),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      `Batch create failed for ${collection}: ${JSON.stringify(errorBody.errors || errorBody)}`,
    );
  }
}

/**
 * Deletes multiple rows from a Directus collection by their IDs.
 */
export async function deleteByIds(
  collection: string,
  ids: number[],
): Promise<void> {
  if (!ids.length) return;
  await fetch(`${getDirectusBaseUrl()}/items/${collection}`, {
    method: "DELETE",
    headers: directusHeaders(),
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
  const res = await fetch(
    `${getDirectusBaseUrl()}/items/${collection}?filter[${filterKey}][_eq]=${filterValue}&fields=id`,
    { headers: directusHeaders() },
  );
  const data = await res.json();
  return ((data.data || []) as { id: number }[]).map((r) => r.id);
}

// ─── Plan Header CRUD ───────────────────────────────────────

/**
 * Creates a new post-dispatch plan header row and returns the full response.
 */
export async function createPlanHeader(
  payload: PlanHeaderPayload,
): Promise<DirectusSingleResponse<PostDispatchPlanRow>> {
  const res = await fetch(
    `${getDirectusBaseUrl()}/items/post_dispatch_plan`,
    {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to create dispatch plan header: ${JSON.stringify(errorBody.errors || errorBody)}`,
    );
  }
  return res.json() as Promise<DirectusSingleResponse<PostDispatchPlanRow>>;
}

/**
 * Updates an existing post-dispatch plan header.
 */
export async function updatePlanHeader(
  planId: number,
  payload: UpdateHeaderPayload,
): Promise<void> {
  await fetch(
    `${getDirectusBaseUrl()}/items/post_dispatch_plan/${planId}`,
    {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    },
  );
}

// ─── Status Updates ─────────────────────────────────────────

/**
 * Updates the status field on a `dispatch_plan` (Pre-Dispatch Plan) row.
 */
export async function updateDispatchPlanStatus(
  pdpId: number,
  status: string,
): Promise<void> {
  const res = await fetch(
    `${getDirectusBaseUrl()}/items/dispatch_plan/${pdpId}`,
    {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to update source PDP status for id=${pdpId}`);
  }
}

// ─── Junction Table ─────────────────────────────────────────

export async function fetchJunctionsByPlanId(
  planId: number,
): Promise<PostDispatchJunctionRow[]> {
  const res = await fetch(
    `${getDirectusBaseUrl()}/items/post_dispatch_dispatch_plans?filter[post_dispatch_plan_id][_eq]=${planId}`,
    { headers: directusHeaders() },
  );
  const data = await res.json();
  return (data.data as PostDispatchJunctionRow[]) || [];
}

/**
 * Updates an existing junction record.
 */
export async function updateJunction(
  junctionId: number,
  payload: Partial<PostDispatchJunctionRow>,
): Promise<void> {
  await fetch(
    `${getDirectusBaseUrl()}/items/post_dispatch_dispatch_plans/${junctionId}`,
    {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Creates a new junction record.
 */
export async function createJunction(
  payload: Omit<PostDispatchJunctionRow, "id">,
): Promise<void> {
  await fetch(
    `${getDirectusBaseUrl()}/items/post_dispatch_dispatch_plans`,
    {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    },
  );
}

// ─── Master Data Queries ────────────────────────────────────

/**
 * Fetches all master lookup data required for the Dispatch Creation form.
 */
export async function fetchMasterData(): Promise<DispatchCreationMasterData> {
  const [drivers, helpers, vehicles, branches, coas] = await Promise.all([
    // Fetch Drivers
    fetchItems<DriverOption>("/items/user", {
      "filter[user_department][_eq]": 8, // Driver department
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Helpers
    fetchItems<HelperOption>("/items/user", {
      "filter[user_department][_eq]": 9, // Helper department
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Vehicles
    fetchItems<{ vehicle_id: number; vehicle_plate: string; vehicle_type?: { type_name?: string } }>("/items/vehicles", {
      "filter[status][_eq]": "Active",
      fields: "vehicle_id,vehicle_plate,vehicle_type.type_name",
      limit: -1,
    }),
    // Fetch Branches (Starting Points)
    fetchItems<BranchOption>("/items/branches", {
      "filter[isActive][_eq]": 1,
      fields: "id,branch_name",
      limit: -1,
    }),
    // Fetch Chart of Accounts for Budgeting
    fetchItems<COAOption>("/items/chart_of_accounts", {
      fields: "coa_id,account_title,gl_code",
      limit: -1,
    }),
  ]);

  return {
    drivers: drivers.data || [],
    helpers: helpers.data || [],
    vehicles: (vehicles.data || []).map((v) => ({
      vehicle_id: v.vehicle_id,
      vehicle_plate: v.vehicle_plate,
      vehicle_type_name: v.vehicle_type?.type_name,
    })),
    branches: branches.data || [],
    coa: coas.data || [],
  };
}

// ─── Post-Dispatch Plan Queries ─────────────────────────────

/**
 * Fetches full details for a specific post-dispatch plan, including assigned staff.
 */
export async function fetchPostDispatchPlanDetails(
  planId: number,
): Promise<PostDispatchPlanDetails> {
  const [planRes, staffRes, junctionRes] = await Promise.all([
    fetchItems<PostDispatchPlanRow>("/items/post_dispatch_plan", {
      "filter[id][_eq]": planId,
      fields: "*",
      limit: 1,
    }),
    fetchItems<PostDispatchStaffRow>("/items/post_dispatch_plan_staff", {
      "filter[post_dispatch_plan_id][_eq]": planId,
      fields: "user_id,role",
      limit: -1,
    }),
    fetchItems<PostDispatchJunctionRow>("/items/post_dispatch_dispatch_plans", {
      "filter[post_dispatch_plan_id][_eq]": planId,
      fields: "dispatch_plan_id",
      limit: -1,
    }),
  ]);

  const planData = planRes.data?.[0];
  if (!planData) {
    throw new Error(`Post-dispatch plan with ID ${planId} not found`);
  }

  const staff = staffRes.data || [];
  const driver = staff.find((s) => s.role === "Driver");
  const helpers = staff.filter((s) => s.role === "Helper");
  const linkedPdps = junctionRes.data || [];
  const linkedPdp = linkedPdps[0];
  const dispatch_ids = [...new Set(linkedPdps.map((p) => p.dispatch_plan_id).filter(Boolean).map(Number))];

  return {
    ...planData,
    dispatch_ids,
    dispatch_id: linkedPdp?.dispatch_plan_id || planData.dispatch_id,
    driver_id: driver?.user_id ?? planData.driver_id,
    helpers: helpers.map((h) => ({ user_id: h.user_id })),
  };
}

// ─── Approved Pre-Dispatch Plans ────────────────────────────

/**
 * Fetches Approved Pre-Dispatch Plans available for conversion.
 * Enriches each plan with cluster name and ready-item count.
 */
export async function fetchApprovedPreDispatchPlans(
  branchId?: number,
  currentPlanId?: number | number[],
): Promise<DirectusResponse<EnrichedApprovedPlan>> {
  const params: Record<string, string | number> = {
    fields:
      "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount,status",
    limit: -1,
  };

  // Build a permissive filter:
  // ( (status = 'Picked' AND branch_id = branchId) OR (dispatch_id IN currentPlanId) )
  if (currentPlanId && branchId) {
    const ids = Array.isArray(currentPlanId) ? currentPlanId.join(",") : currentPlanId;
    params["filter[_or][0][_and][0][status][_eq]"] = "Picked";
    params["filter[_or][0][_and][1][branch_id][_eq]"] = branchId;
    params["filter[_or][1][dispatch_id][_in]"] = ids;
  } else if (branchId) {
    params["filter[status][_eq]"] = "Picked";
    params["filter[branch_id][_eq]"] = branchId;
  } else if (currentPlanId) {
    const ids = Array.isArray(currentPlanId) ? currentPlanId.join(",") : currentPlanId;
    params["filter[dispatch_id][_in]"] = ids;
  } else {
    params["filter[status][_eq]"] = "Picked";
  }

  const plansRes = await fetchItems<RawDispatchPlan>(
    "/items/dispatch_plan",
    params,
  );
  const plans = plansRes.data || [];

  if (!plans.length) return { data: [] };

  const planIds = plans.map((p) => p.dispatch_id);

  const [clustersRes, detailsRes] = await Promise.all([
    fetchItems<ClusterRow>("/items/cluster", {
      fields: "id,cluster_name",
      limit: -1,
    }),
    fetchItems<{ dispatch_id: number; sales_order_id: number }>(
      "/items/dispatch_plan_details",
      {
        "filter[dispatch_id][_in]": planIds.join(","),
        fields: "dispatch_id,sales_order_id",
        limit: -1,
      },
    ),
  ]);

  const details = detailsRes.data || [];
  const soIds = [...new Set(details.map((d) => d.sales_order_id))];

  // Build a set of currently linked PDP IDs for edit mode
  const currentPlanIdSet = new Set<number>(
    currentPlanId
      ? Array.isArray(currentPlanId) ? currentPlanId : [currentPlanId]
      : [],
  );

  if (!soIds.length && currentPlanIdSet.size === 0) return { data: [] };

  let orders: RawSalesOrder[] = [];
  let invoicesRes: { data: RawSalesInvoice[] } | undefined;

  if (soIds.length) {
    const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_id,order_no,order_status",
      limit: -1,
    });

    orders = ordersRes.data || [];
    const orderNos = orders.map((o) => o.order_no).filter(Boolean);

    if (orderNos.length) {
      invoicesRes = await fetchItems<RawSalesInvoice>("/items/sales_invoice", {
        "filter[order_id][_in]": orderNos.join(","),
        fields: "invoice_id,order_id,transaction_status",
        limit: -1,
      });
    }
  }

  const orderIdToMapData = new Map(
    orders.map((o) => [o.order_id, { no: o.order_no, status: o.order_status }]),
  );
  const invoiceMap = new Map(
    (invoicesRes?.data || []).map((i) => [i.order_id, i.transaction_status]),
  );
  const clusterMap = new Map(
    (clustersRes.data || []).map((c) => [c.id, c.cluster_name]),
  );

  const detailCountMap = new Map<number, number>();
  details.forEach((d) => {
    const dPlanId = d.dispatch_id;
    const orderData = orderIdToMapData.get(d.sales_order_id);
    if (!dPlanId || !orderData) return;

    // For currently linked PDPs (edit mode), count ALL items regardless of status
    if (currentPlanIdSet.has(dPlanId)) {
      detailCountMap.set(dPlanId, (detailCountMap.get(dPlanId) || 0) + 1);
      return;
    }

    const invoiceStatus = invoiceMap.get(orderData.no);
    const isReady =
      READY_STATUSES.includes(orderData.status) ||
      (invoiceStatus != null && READY_STATUSES.includes(invoiceStatus));

    if (isReady) {
      detailCountMap.set(dPlanId, (detailCountMap.get(dPlanId) || 0) + 1);
    }
  });

  const enrichedData = plans
    .map((p) => ({
      ...p,
      cluster_name: clusterMap.get(p.cluster_id || -1) || "Unassigned",
      total_items: detailCountMap.get(p.dispatch_id) || 0,
    }))
    // Keep linked PDPs even if they have 0 ready items
    .filter((p) => p.total_items > 0 || currentPlanIdSet.has(p.dispatch_id));

  return { data: enrichedData };
}

// ─── Plan Details (Invoices / Sales Orders) ─────────────────

/**
 * Fetches details (linked sales orders) for a specific dispatch plan.
 * Returns customer name, order status, city, and amount for each linked order.
 */
export async function fetchPlanDetails(
  planIds: number[],
  tripId?: number,
): Promise<DirectusResponse<EnrichedPlanDetail>> {
  // 1. Get all sales_order_ids for the requested PDPs
  const pdpDetailsRes = await fetchItems<DispatchPlanDetailRow>(
    "/items/dispatch_plan_details",
    {
      "filter[dispatch_id][_in]": planIds.join(","),
      fields: "detail_id,dispatch_id,sales_order_id",
      limit: -1,
    },
  );
  const pdpDetails = pdpDetailsRes.data || [];
  if (!pdpDetails.length) return { data: [] };

  const requestedSoIds = pdpDetails
    .map((d) => Number(d.sales_order_id))
    .filter(Boolean);

  // 2. Identify already linked invoices if in Edit mode
  const currentlyLinkedInvIds = new Set<number>();
  if (tripId) {
    const tripInvoicesRes = await fetchItems<{ invoice_id: number }>(
      "/items/post_dispatch_invoices",
      {
        "filter[post_dispatch_plan_id][_eq]": tripId,
        fields: "invoice_id",
        limit: -1,
      },
    );
    (tripInvoicesRes.data || []).forEach((ti) => {
      const id = Number(ti.invoice_id);
      if (id) currentlyLinkedInvIds.add(id);
    });
  }

  // 3. Fetch orders
  const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
    "filter[order_id][_in]": requestedSoIds.join(","),
    fields:
      "order_id,order_no,customer_code,order_status,total_amount,net_amount",
    limit: -1,
  });
  const orders = ordersRes.data || [];
  const orderMap = new Map<number, RawSalesOrder>(
    orders.map((o) => [Number(o.order_id), o]),
  );

  // 4. Fetch invoices
  const orderNos = orders.map((o) => o.order_no).filter(Boolean);
  let invoiceMap = new Map<string, RawSalesInvoice>();
  if (orderNos.length) {
    const invoicesRes = await fetchItems<RawSalesInvoice>(
      "/items/sales_invoice",
      {
        "filter[order_id][_in]": orderNos.join(","),
        fields: "invoice_id,order_id,transaction_status",
        limit: -1,
      },
    );
    (invoicesRes.data || []).forEach((i) => {
      if (i.order_id) invoiceMap.set(String(i.order_id), i);
    });
  }

  // 5. Fetch customers
  const customerCodes = [
    ...new Set(orders.map((o) => o.customer_code).filter(Boolean)),
  ] as string[];
  let customerMap = new Map<string, CustomerRow>();
  if (customerCodes.length) {
    const custRes = await fetchItems<CustomerRow>("/items/customer", {
      "filter[customer_code][_in]": customerCodes.join(","),
      fields: "customer_code,customer_name,store_name,city",
      limit: -1,
    });
    (custRes.data || []).forEach((c) => {
      if (c.customer_code) customerMap.set(String(c.customer_code), c);
    });
  }

  // 6. Enrichment loop
  const seenInvoices = new Set<number>();
  const enrichedDetails = pdpDetails
    .map((d): EnrichedPlanDetail | null => {
      const order = orderMap.get(Number(d.sales_order_id));
      if (!order) return null;

      const orderNo = order.order_no ? String(order.order_no) : "";
      const invoice = orderNo ? invoiceMap.get(orderNo) : undefined;
      const invId = invoice ? Number(invoice.invoice_id) : 0;

      // Type-safe deduplication
      if (invId > 0) {
        if (seenInvoices.has(invId)) return null;
        seenInvoices.add(invId);
      }

      const orderStatus = order.order_status || "—";
      const isReady = READY_STATUSES.includes(orderStatus);
      const isAlreadyLinked = invId > 0 && currentlyLinkedInvIds.has(invId);

      // In Edit mode (tripId), we keep already linked invoices.
      // We also allow "Ready" invoices from both existing and new PDPs.
      if (!isReady && !isAlreadyLinked) return null;

      const customer = order.customer_code
        ? customerMap.get(String(order.customer_code))
        : undefined;

      return {
        detail_id: d.detail_id,
        sales_order_id: Number(d.sales_order_id),
        invoice_id: invId || undefined,
        order_no: orderNo || "—",
        order_status: invoice?.transaction_status || orderStatus,
        true_order_status: orderStatus,
        customer_name: customer?.customer_name || customer?.store_name || "—",
        city: customer?.city || "—",
        amount: order.net_amount ?? order.total_amount ?? 0,
      };
    })
    .filter((d): d is EnrichedPlanDetail => d !== null);

  return { data: enrichedDetails };
}

// ─── Budget Queries ─────────────────────────────────────────

/**
 * Fetches all post-dispatch budgets across every plan (for table enrichment).
 */
export async function fetchAllBudgets(): Promise<PostDispatchBudgetRow[]> {
  const res = await fetchItems<PostDispatchBudgetRow>(
    "/items/post_dispatch_budgeting",
    {
      limit: -1,
      fields: "post_dispatch_plan_id,amount",
    },
  );
  return res.data || [];
}

/**
 * Fetches budgets for a specific dispatch plan.
 */
export async function fetchPlanBudgets(
  planId: number,
): Promise<PostDispatchBudgetRow[]> {
  const res = await fetchItems<PostDispatchBudgetRow>(
    "/items/post_dispatch_budgeting",
    {
      "filter[post_dispatch_plan_id][_eq]": planId,
      fields: "coa_id,amount,remarks",
      limit: -1,
    },
  );
  return res.data || [];
}

// ─── Invoice ID Resolution ──────────────────────────────────

/**
 * Fetches only the invoice IDs (PK) associated with a PDP.
 * Useful for persisting links in post_dispatch_invoices.
 */
export async function fetchPdpInvoiceIds(pdpIds: number[]): Promise<number[]> {
  const detailsRes = await fetchItems<{ sales_order_id: number }>(
    "/items/dispatch_plan_details",
    {
      "filter[dispatch_id][_in]": pdpIds.join(","),
      fields: "sales_order_id",
      limit: -1,
    },
  );
  const details = detailsRes.data || [];
  if (!details.length) return [];

  const soIds = details.map((d) => d.sales_order_id);
  const ordersRes = await fetchItems<{ order_no: string }>(
    "/items/sales_order",
    {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_no",
      limit: -1,
    },
  );
  const orderNos = (ordersRes.data || [])
    .map((o) => o.order_no)
    .filter(Boolean);
  if (!orderNos.length) return [];

  const invoicesRes = await fetchItems<{ invoice_id: number }>(
    "/items/sales_invoice",
    {
      "filter[order_id][_in]": orderNos.join(","),
      fields: "invoice_id",
      limit: -1,
    },
  );
  const invoiceIds = (invoicesRes.data || []).map((i) => i.invoice_id);
  return [...new Set(invoiceIds)];
}
