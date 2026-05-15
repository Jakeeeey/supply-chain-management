// ─── Dispatch Creation Module — Plan Details Repository ─────
// Enriches plan details with customer, invoice, weight, and budget data.
// Consumed only by dispatch.service.ts.

import type {
  CustomerRow,
  DirectusResponse,
  DispatchPlanDetailRow,
  EnrichedPlanDetail,
  PostDispatchBudgetRow,
  PostDispatchInvoiceRow,
  PostDispatchJunctionRow,
  PostDispatchOtherRowDetail,
  PostDispatchPlanDetails,
  PostDispatchPlanRow,
  PostDispatchPurchaseRow,
  PostDispatchStaffRow,
  RawSalesInvoice,
  RawSalesOrder,
} from "../types/dispatch.types";
import { fetchItems, fetchItemsInChunks } from "./api";

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
