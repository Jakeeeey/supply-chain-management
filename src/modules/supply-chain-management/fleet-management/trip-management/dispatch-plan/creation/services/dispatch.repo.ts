// ─── Dispatch Creation Module — Repository Layer ────────────
// ALL Directus I/O lives here. No business logic.
// Consumed only by dispatch.service.ts.

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
  PostDispatchJunctionRow,
  PostDispatchPlanDetails,
  PostDispatchPlanRow,
  PostDispatchStaffRow,
  RawDispatchPlan,
  RawSalesInvoice,
  RawSalesOrder,
  UpdateHeaderPayload,
  PostDispatchInvoiceRow,
  PostDispatchOtherRowDetail,
  PostDispatchPurchaseRow,
  PurchaseOrderRow,
} from "../types/dispatch.types";
import { fetchItems, fetchItemsInChunks } from "./api";
import { directusHeaders, getDirectusBaseUrl } from "./dispatch.helpers";

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
  const res = await fetch(`${getDirectusBaseUrl()}/items/post_dispatch_plan`, {
    method: "POST",
    headers: directusHeaders(),
    body: JSON.stringify(payload),
  });
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
  await fetch(`${getDirectusBaseUrl()}/items/post_dispatch_plan/${planId}`, {
    method: "PATCH",
    headers: directusHeaders(),
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

/**
 * Updates the `inventory_status` field on a `purchase_order` row.
 * Status 11 = "Picked" (available), Status 12 = "En Route" (dispatched).
 */
export async function updatePurchaseOrderStatus(
  poId: number,
  inventoryStatus: number,
): Promise<void> {
  const res = await fetch(
    `${getDirectusBaseUrl()}/items/purchase_order/${poId}`,
    {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify({ inventory_status: inventoryStatus }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to update PO status for id=${poId}`);
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
  await fetch(`${getDirectusBaseUrl()}/items/post_dispatch_dispatch_plans`, {
    method: "POST",
    headers: directusHeaders(),
    body: JSON.stringify(payload),
  });
}

// ─── Master Data Queries ────────────────────────────────────

/**
 * Fetches all master lookup data required for the Dispatch Creation form.
 */
export async function fetchMasterData(): Promise<DispatchCreationMasterData> {
  const [drivers, helpers, vehicles, branches, coas] = await Promise.all([
    // Fetch Drivers
    fetchItems<DriverOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Helpers
    fetchItems<HelperOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Vehicles
    fetchItems<{
      vehicle_id: number;
      vehicle_plate: string;
      maximum_weight?: number | string;
      vehicle_type?: { type_name?: string };
    }>("/items/vehicles", {
      "filter[status][_eq]": "Active",
      fields: "vehicle_id,vehicle_plate,maximum_weight,vehicle_type.type_name",
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
      fields: "coa_id,account_title,gl_code,account_type,is_payment",
      "filter[_and][0][account_type][_in]": "8,9",
      limit: -1,
    }),
  ]);

  return {
    drivers: drivers.data || [],
    helpers: helpers.data || [],
    vehicles: (vehicles.data || []).map((v) => ({
      vehicle_id: v.vehicle_id,
      vehicle_plate: v.vehicle_plate,
      maximum_weight: v.maximum_weight,
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
  const dispatch_ids = [
    ...new Set(
      linkedPdps
        .map((p) => p.dispatch_plan_id)
        .filter(Boolean)
        .map(Number),
    ),
  ];

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
  limit: number = 25,
  offset: number = 0,
  search?: string
): Promise<DirectusResponse<EnrichedApprovedPlan>> {
  const params: Record<string, string | number> = {
    fields:
      "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount,status",
    limit,
    offset,
    sort: "-dispatch_id"
  };

  // Build a permissive filter:
  // ( (status = 'Picked' AND branch_id = branchId) OR (dispatch_id IN currentPlanId) )
  const baseFilter: Record<string, unknown>[] = [];

  if (search) {
     baseFilter.push({ dispatch_no: { _icontains: search } });
  }
  if (currentPlanId && branchId) {
    const ids = Array.isArray(currentPlanId)
      ? currentPlanId.join(",")
      : currentPlanId;
    if (search) {
        params["filter[_and][0][_or][0][_and][0][status][_eq]"] = "Picked";
        params["filter[_and][0][_or][0][_and][1][branch_id][_eq]"] = branchId;
        params["filter[_and][0][_or][1][dispatch_id][_in]"] = ids;
        params["filter[_and][1][dispatch_no][_icontains]"] = search;
    } else {
        params["filter[_or][0][_and][0][status][_eq]"] = "Picked";
        params["filter[_or][0][_and][1][branch_id][_eq]"] = branchId;
        params["filter[_or][1][dispatch_id][_in]"] = ids;
    }
  } else if (branchId) {
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][status][_eq]" : "filter[status][_eq]"] = "Picked";
    params[search ? "filter[_and][2][branch_id][_eq]" : "filter[branch_id][_eq]"] = branchId;
  } else if (currentPlanId) {
    const ids = Array.isArray(currentPlanId)
      ? currentPlanId.join(",")
      : currentPlanId;
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][dispatch_id][_in]" : "filter[dispatch_id][_in]"] = ids;
  } else {
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][status][_eq]" : "filter[status][_eq]"] = "Picked";
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

  // 1. Fetch Sales Orders first to check status
  let orders: RawSalesOrder[] = [];
  const orderStatusMap = new Map<number, string>();
  
  if (soIds.length > 0) {
    const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_id,order_no,order_status",
      limit: -1,
    });
    orders = ordersRes.data || [];
    orders.forEach(o => {
      if (o.order_id) orderStatusMap.set(Number(o.order_id), o.order_status || "");
    });
  }

  // 2. --- WEIGHT CALCULATION START ---
  const planWeightMap = new Map<number, number>();
  if (soIds.length > 0) {
    const { data: soDetails } = await fetchItemsInChunks<{
      order_id: number;
      product_id: number;
      ordered_quantity: number | string;
      allocated_quantity: number | string;
    }>("/items/sales_order_details", "order_id", soIds, {
      fields: "order_id,product_id,ordered_quantity,allocated_quantity",
    });

    const productIds = [...new Set(soDetails.map((d) => Number(d.product_id)).filter(Boolean))];
    const prodWeightMap = new Map<number, number>();

    if (productIds.length > 0) {
      const { data: products } = await fetchItemsInChunks<{
        product_id: number;
        weight: string | number;
      }>("/items/products", "product_id", productIds, {
        fields: "product_id,weight",
      });
      products.forEach((p) =>
        prodWeightMap.set(Number(p.product_id), Number(p.weight || 0)),
      );
    }

    const soWeightMap = new Map<number, number>();
    const soReadyMap = new Map<number, boolean>(); // Track if each SO is ready

    soDetails.forEach((sd) => {
      const soId = Number(sd.order_id);
      const status = orderStatusMap.get(soId) || "";
      const isReady = READY_STATUSES.includes(status);
      
      // Store readiness for later is_selectable check
      if (!soReadyMap.has(soId) || !isReady) {
        soReadyMap.set(soId, isReady);
      }

      const weight = prodWeightMap.get(Number(sd.product_id)) || 0;
      const qty = Number(sd.allocated_quantity || sd.ordered_quantity || 0);
      soWeightMap.set(soId, (soWeightMap.get(soId) || 0) + weight * qty);
    });

    details.forEach((d) => {
      const pId = Number(d.dispatch_id);
      const soWeight = soWeightMap.get(Number(d.sales_order_id)) || 0;
      planWeightMap.set(pId, (planWeightMap.get(pId) || 0) + soWeight);
    });
  }
  // --- WEIGHT CALCULATION END ---

  // Build a set of currently linked PDP IDs for edit mode
  const currentPlanIdSet = new Set<number>(
    currentPlanId
      ? Array.isArray(currentPlanId)
        ? currentPlanId
        : [currentPlanId]
      : [],
  );

  if (!soIds.length && currentPlanIdSet.size === 0) return { data: [] };

  // 3. (No longer fetching invoices as we only use Sales Order status for Sidebar filtering)
  const clusterMap = new Map(
    (clustersRes.data || []).map((c) => [c.id, c.cluster_name]),
  );

  const detailCountMap = new Map<number, number>();
  const planReadyMap = new Map<number, boolean>(); // Track if entire plan is selectable

  details.forEach((d) => {
    const dPlanId = d.dispatch_id;
    if (!dPlanId) return;

    // Count ALL items
    detailCountMap.set(dPlanId, (detailCountMap.get(dPlanId) || 0) + 1);

    // Check readiness of the plan
    const soId = Number(d.sales_order_id);
    const isSoReady = orderStatusMap.has(soId) ? READY_STATUSES.includes(orderStatusMap.get(soId)!) : false;
    
    if (!planReadyMap.has(dPlanId)) {
        planReadyMap.set(dPlanId, true);
    }
    if (!isSoReady) {
        planReadyMap.set(dPlanId, false);
    }
  });

  const enrichedData = plans
    .map((p) => {
        const total_items = detailCountMap.get(p.dispatch_id) || 0;
        return {
          ...p,
          cluster_name: clusterMap.get(p.cluster_id || -1) || "Unassigned",
          total_items,
          total_weight: planWeightMap.get(p.dispatch_id) || 0,
          is_selectable: total_items > 0 && (planReadyMap.get(p.dispatch_id) ?? false),
        };
    });

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

  // 2. Identify already linked invoices & manual stops if in Edit mode
  const currentlyLinkedInvIds = new Set<number>();
  let manualStops: EnrichedPlanDetail[] = [];
  const invoiceSequenceMap = new Map<number, { sequence: number; status: string }>();

  if (tripId) {
    const [tripInvoicesRes, tripOthersRes, tripPurchasesRes] =
      await Promise.all([
        fetchItems<PostDispatchInvoiceRow>("/items/post_dispatch_invoices", {
          "filter[post_dispatch_plan_id][_eq]": tripId,
          fields: "invoice_id,sequence,status",
          limit: -1,
        }),
        fetchItems<PostDispatchOtherRowDetail>("/items/post_dispatch_plan_others", {
          "filter[post_dispatch_plan_id][_eq]": tripId,
          fields: "id,remarks,distance,sequence,status",
          limit: -1,
        }),
        fetchItems<PostDispatchPurchaseRow>("/items/post_dispatch_purchases", {
          "filter[post_dispatch_plan_id][_eq]": tripId,
          fields:
            "id,po_id.purchase_order_id,po_id.purchase_order_no,distance,sequence,status",
          limit: -1,
        }),
      ]);

    const poStops = (tripPurchasesRes.data || []).map((po) => ({
      detail_id: `po-${po.id}`,
      amount: 0,
      isPoStop: true,
      po_id: typeof po.po_id === "object" ? po.po_id.purchase_order_id : undefined,
      po_no: typeof po.po_id === "object" ? po.po_id.purchase_order_no : "—",
      distance: po.distance,
      sequence: po.sequence,
      status: po.status,
    }));

    (tripInvoicesRes.data || []).forEach((ti) => {
      const id = Number(ti.invoice_id);
      if (id) {
        currentlyLinkedInvIds.add(id);
        invoiceSequenceMap.set(id, {
          sequence: ti.sequence,
          status: ti.status || "Not Fulfilled",
        });
      }
    });

    manualStops = (tripOthersRes.data || []).map((other) => ({
      detail_id: `other-${other.id}`,
      amount: 0,
      isManualStop: true,
      remarks: other.remarks,
      distance: other.distance,
      sequence: other.sequence,
      status: other.status,
    }));

    manualStops = [...manualStops, ...poStops];
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

  // 4. Fetch invoices (store ALL non-void invoices per order)
  const VOID_STATUSES = ["Void", "void"];
  const orderNos = orders.map((o) => o.order_no).filter(Boolean);
  const invoiceMap = new Map<string, RawSalesInvoice[]>();
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
      if (!i.order_id) return;
      // Skip voided invoices
      if (VOID_STATUSES.includes(i.transaction_status)) return;

      const key = String(i.order_id);
      const existing = invoiceMap.get(key) || [];
      existing.push(i);
      invoiceMap.set(key, existing);
    });
  }

  // 5. Fetch customers
  const customerCodes = [
    ...new Set(orders.map((o) => o.customer_code).filter(Boolean)),
  ] as string[];
  const customerMap = new Map<string, CustomerRow>();
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

  // 6. Fetch weights for these orders
  const orderWeightMap = new Map<number, number>();
  if (requestedSoIds.length) {
    try {
      const { data: soDetails } = await fetchItemsInChunks<{
        order_id: number;
        product_id: number;
        ordered_quantity: number | string;
        allocated_quantity: number | string;
      }>("/items/sales_order_details", "order_id", requestedSoIds, {
        fields: "order_id,product_id,ordered_quantity,allocated_quantity",
      });

      const productIds = [...new Set(soDetails.map((d) => Number(d.product_id)).filter(Boolean))];

      if (productIds.length) {
        const { data: products } = await fetchItemsInChunks<{
          product_id: number;
          weight: number | string | null;
        }>("/items/products", "product_id", productIds, {
          fields: "product_id,weight",
        });

        const prodWeightMap = new Map<number, number>(
          products.map((p) => [Number(p.product_id), Number(p.weight || 0)])
        );

        soDetails.forEach((detail) => {
          const oid = Number(detail.order_id);
          const weight = prodWeightMap.get(Number(detail.product_id)) || 0;
          const qty = Number(detail.allocated_quantity || detail.ordered_quantity || 0);
          const currentTotal = orderWeightMap.get(oid) || 0;
          orderWeightMap.set(oid, currentTotal + weight * qty);
        });
      }
    } catch (err) {
      console.error("[fetchPlanDetails Weight Error]:", err);
    }
  }

  // 7. Enrichment loop for invoices
  const seenOrderNos = new Set<string>();
  const invoiceOrderNos = new Set<string>();

  const enrichedInvoices = pdpDetails
    .map((d): EnrichedPlanDetail | null => {
      const order = orderMap.get(Number(d.sales_order_id));
      if (!order) return null;

      const orderNo = order.order_no ? String(order.order_no) : "";

      // Deduplicate by order_no (one row per SO in the route)
      if (orderNo && seenOrderNos.has(orderNo)) return null;
      if (orderNo) seenOrderNos.add(orderNo);

      const invoices = orderNo ? (invoiceMap.get(orderNo) || []) : [];
      const primaryInvoice = invoices[0];
      const primaryInvId = primaryInvoice ? Number(primaryInvoice.invoice_id) : 0;
      const allInvIds = invoices.map((inv) => Number(inv.invoice_id)).filter(Boolean);

      if (allInvIds.length > 0) {
        invoiceOrderNos.add(orderNo);
      }

      const orderStatus = order.order_status || "—";
      const customer = order.customer_code
        ? customerMap.get(String(order.customer_code))
        : undefined;

      const tripData = primaryInvId > 0 ? invoiceSequenceMap.get(primaryInvId) : undefined;

      return {
        detail_id: d.detail_id,
        sales_order_id: Number(d.sales_order_id),
        invoice_id: primaryInvId || undefined,
        invoice_ids: allInvIds.length > 0 ? allInvIds : undefined,
        order_no: orderNo || "—",
        // Status MUST reflect the Sales Order status directly
        order_status: tripData?.status || orderStatus,
        true_order_status: orderStatus,
        invoice_status: primaryInvoice?.transaction_status || undefined,
        customer_name: customer?.customer_name || customer?.store_name || "—",
        city: customer?.city || "—",
        amount: order.net_amount ?? order.total_amount ?? 0,
        weight: orderWeightMap.get(Number(d.sales_order_id)) || 0,
        sequence: tripData?.sequence,
      };
    })
    .filter((d): d is EnrichedPlanDetail => d !== null);

  // 8. Filter manual stops to exclude those that are actually invoices
  const actualManualStops = manualStops.filter(
    (ms) => !invoiceOrderNos.has(ms.remarks || ""),
  );

  // 9. Combine and sort
  const result = [...enrichedInvoices, ...actualManualStops];

  if (tripId) {
    const tripOthersRes = await fetchItems<{
      remarks: string;
      sequence: number;
      status: string;
    }>("/items/post_dispatch_plan_others", {
      "filter[post_dispatch_plan_id][_eq]": tripId,
      fields: "remarks,sequence,status",
      limit: -1,
    });
    const stopDataMap = new Map(
      (tripOthersRes.data || []).map((r) => [
        r.remarks,
        { seq: r.sequence, status: r.status },
      ]),
    );

    const tripPOSequencesRes = await fetchItems<PostDispatchPurchaseRow>(
      "/items/post_dispatch_purchases",
      {
        "filter[post_dispatch_plan_id][_eq]": tripId,
        fields: "po_id,sequence,status",
        limit: -1,
      },
    );
    const poDataMap = new Map<number, { seq: number; status: string }>(
      (tripPOSequencesRes.data || []).map((r) => {
          const poId = typeof r.po_id === "object" ? r.po_id.purchase_order_id : Number(r.po_id);
          return [poId, { seq: r.sequence, status: r.status }];
      }),
    );

    result.forEach((item) => {
      let key: string | number | undefined;
      let mapToUse:
        | Map<string | number, { seq: number; status: string }>
        | undefined;

      if (item.isManualStop) {
        key = item.remarks;
        mapToUse = stopDataMap;
      } else if (item.isPoStop) {
        key = Number(item.po_id);
        mapToUse = poDataMap;
      } else {
        key = item.order_no;
        mapToUse = stopDataMap;
      }

      const data = key && mapToUse ? mapToUse.get(key) : undefined;
      if (data) {
        item.sequence = data.seq;
        item.status = data.status;
      }
    });

    result.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  return { data: result };
}

/**
 * Fetches available purchase orders for selection in route stops.
 */
export async function fetchPurchaseOrders(
  query?: string,
  branchId?: number
): Promise<PurchaseOrderRow[]> {
  const params: Record<string, string | number> = {
    fields:
      "purchase_order_id,purchase_order_no,date,supplier_name,total_amount,inventory_status",
    limit: -1,
    sort: "-date",
    "filter[inventory_status][_eq]": 11,
  };
  if (query) {
    params["filter[_and][2][purchase_order_no][_contains]"] = query;
  }
  if (branchId) {
    params["filter[_and][3][branch_id][_eq]"] = branchId;
  }
  const res = await fetchItems<PurchaseOrderRow & { inventory_status: number }>(
    "/items/purchase_order",
    params,
  );

  const poData = res.data || [];
  if (poData.length === 0) return [];

  // Fetch transaction status map to resolve numeric statuses
  const transRes = await fetchItems<{ id: number; status: string }>(
    "/items/transaction_status",
    { limit: -1, fields: "id,status" }
  );
  const statusMap = new Map((transRes.data || []).map((s) => [Number(s.id), s.status]));

  return poData.map((po) => ({
    ...po,
    inventory_status: statusMap.get(Number(po.inventory_status)) || `Status ${po.inventory_status}`,
  })) as unknown as PurchaseOrderRow[];
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

  const invoicesRes = await fetchItems<{ invoice_id: number; transaction_status: string }>(
    "/items/sales_invoice",
    {
      "filter[order_id][_in]": orderNos.join(","),
      fields: "invoice_id,transaction_status",
      limit: -1,
    },
  );
  const VOID_STATUSES = ["Void", "void"];
  const invoiceIds = (invoicesRes.data || [])
    .filter((i) => !VOID_STATUSES.includes(i.transaction_status))
    .map((i) => i.invoice_id);
  return [...new Set(invoiceIds)];
}
