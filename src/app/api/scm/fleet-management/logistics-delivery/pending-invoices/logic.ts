import { NextResponse } from "next/server";
import { chunk, directusGet, type DirectusListResponse } from "./_directus";

// --- Types ---

export type PendingStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export type PendingInvoiceListRow = {
  id: number;
  invoice_no: string;
  invoice_date: string | null;
  customer: string | null;
  salesman: string | null;
  salesman_id: number | null;
  net_amount: number;
  dispatch_plan: string;
  pending_status: PendingStatus;
};

export type PendingInvoiceKpis = {
  total_count: number;
  total_amount: number;
  by_status: Record<PendingStatus, { count: number; amount: number }>;
};

export type ListFilters = {
  q?: string;
  status?: string;
  salesmanId?: string;
  customerCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

// --- Helpers ---

function normalizeStr(s: unknown) {
  return (typeof s === "string" ? s : "").trim();
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateOnlyIso(v: unknown) {
  if (!v) return null;
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function getNextDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function derivePendingStatus(
  dispatch_plan: string,
  transaction_status: string | null
): PendingStatus {
  const dp = normalizeStr(dispatch_plan).toLowerCase();
  if (!dp || dp === "unlinked") return "Unlinked";
  const st = normalizeStr(transaction_status).toLowerCase();
  if (st.includes("clear")) return "Cleared";
  if (st.includes("inbound")) return "Inbound";
  return "For Dispatch";
}

// --- Data Fetching Logic ---

async function fetchInvoicesBase(filters: ListFilters) {
  const directusFilter: any = {
    _and: [{ sales_type: { _eq: 1 } }],
  };

  if (filters.dateFrom && filters.dateFrom.trim() !== "") {
    directusFilter._and.push({ dispatch_date: { _gte: filters.dateFrom } });
  }

  if (filters.dateTo && filters.dateTo.trim() !== "") {
    const nextDay = getNextDay(filters.dateTo);
    directusFilter._and.push({ dispatch_date: { _lt: nextDay } });
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();

    // 1. Pre-fetch related IDs
    const [salesmenRes, customersRes, plansRes] = await Promise.all([
      directusGet<DirectusListResponse<any>>("/items/salesman", {
        filter: JSON.stringify({ salesman_name: { _icontains: q } }),
        fields: "id"
      }),
      directusGet<DirectusListResponse<any>>("/items/customer", {
        filter: JSON.stringify({ customer_name: { _icontains: q } }),
        fields: "customer_code"
      }),
      directusGet<DirectusListResponse<any>>("/items/post_dispatch_plan", {
        filter: JSON.stringify({ doc_no: { _icontains: q } }),
        fields: "id"
      })
    ]);

    const salesIds = (!(salesmenRes instanceof NextResponse) ? (salesmenRes.data ?? []) : []).map((s: any) => s.id);
    const customerCodes = (!(customersRes instanceof NextResponse) ? (customersRes.data ?? []) : []).map((c: any) => c.customer_code);
    const planIds = (!(plansRes instanceof NextResponse) ? (plansRes.data ?? []) : []).map((p: any) => p.id);

    let planInvoiceIds: number[] = [];
    if (planIds.length > 0) {
      const planLinks = await directusGet<DirectusListResponse<any>>("/items/post_dispatch_invoices", {
        filter: JSON.stringify({ post_dispatch_plan_id: { _in: planIds } }),
        fields: "invoice_id"
      });
      planInvoiceIds = (!(planLinks instanceof NextResponse) ? (planLinks.data ?? []) : []).map((p: any) => p.invoice_id);
    }

    // 2. Build the OR filter
    const searchConditions: any[] = [
      { invoice_no: { _icontains: q } },
      { customer_code: { _icontains: q } },
    ];

    if (salesIds.length > 0) searchConditions.push({ salesman_id: { _in: salesIds } });
    if (customerCodes.length > 0) searchConditions.push({ customer_code: { _in: customerCodes } });
    if (planInvoiceIds.length > 0) searchConditions.push({ invoice_id: { _in: planInvoiceIds } });

    directusFilter._and.push({ _or: searchConditions });
  }

  const res = await directusGet<DirectusListResponse<any>>("/items/sales_invoice", {
    fields: "invoice_id,invoice_no,customer_code,dispatch_date,salesman_id,sales_type,net_amount,transaction_status,order_id,vat_amount,gross_amount,discount_amount",
    sort: "-dispatch_date",
    limit: "-1",
    filter: JSON.stringify(directusFilter),
  });
  return !(res instanceof NextResponse) ? (res.data ?? []) : [];
}

async function fetchDispatchPlans(invoiceIds: number[]) {
  const map = new Map<number, string[]>();
  if (!invoiceIds.length) return map;

  const pivots = [];
  for (const batch of chunk(invoiceIds, 200)) {
    const res = await directusGet<DirectusListResponse<any>>("/items/post_dispatch_invoices", {
      fields: "invoice_id,post_dispatch_plan_id",
      limit: "-1",
      filter: JSON.stringify({ invoice_id: { _in: batch } }),
    });
    if (!(res instanceof NextResponse)) {
      pivots.push(...(res.data ?? []));
    }
  }

  const planIds = [...new Set(pivots.map((p: any) => p.post_dispatch_plan_id))].filter(Boolean);
  const planDocMap = new Map<number, string>();

  if (planIds.length) {
    for (const batch of chunk(planIds, 200)) {
      const res = await directusGet<DirectusListResponse<any>>("/items/post_dispatch_plan", {
        fields: "id,doc_no",
        limit: "-1",
        filter: JSON.stringify({ id: { _in: batch } }),
      });
      if (!(res instanceof NextResponse)) {
        (res.data ?? []).forEach((r: any) => planDocMap.set(r.id, r.doc_no));
      }
    }
  }

  pivots.forEach((p) => {
    const doc = planDocMap.get(p.post_dispatch_plan_id);
    if (doc) {
      const arr = map.get(p.invoice_id) ?? [];
      arr.push(doc);
      map.set(p.invoice_id, arr);
    }
  });

  return map;
}

// --- Main List Function ---
export async function listPendingInvoices(filters: ListFilters) {
  const allInvoices = await fetchInvoicesBase(filters);

  const customerCodes = [...new Set(allInvoices.map((i) => i.customer_code).filter(Boolean))];
  const salesmanIds = [...new Set(allInvoices.map((i) => i.salesman_id).filter(Boolean))];
  const invoiceIds = allInvoices.map((i) => i.invoice_id);

  const [customersRes, salesmenRes, dispatchMap] = await Promise.all([
    directusGet<DirectusListResponse<any>>("/items/customer", {
      fields: "customer_code,customer_name",
      limit: "-1",
      filter: JSON.stringify({ customer_code: { _in: customerCodes } }),
    }),
    directusGet<DirectusListResponse<any>>("/items/salesman", {
      fields: "id,salesman_name",
      limit: "-1",
      filter: JSON.stringify({ id: { _in: salesmanIds } }),
    }),
    fetchDispatchPlans(invoiceIds),
  ]);

  const custMap = new Map(!(customersRes instanceof NextResponse) ? (customersRes.data ?? []).map((c: any) => [c.customer_code, c.customer_name]) : []);
  const salesMap = new Map(!(salesmenRes instanceof NextResponse) ? (salesmenRes.data ?? []).map((s: any) => [s.id, s.salesman_name]) : []);

  let rows: PendingInvoiceListRow[] = allInvoices.map((inv) => {
    const docs = dispatchMap.get(inv.invoice_id);
    const dispatch_plan = docs && docs.length > 0 ? docs.sort().join(", ") : "unlinked";
    const status = derivePendingStatus(dispatch_plan, inv.transaction_status);
    const salesmanName = salesMap.get(inv.salesman_id);

    return {
      id: inv.invoice_id,
      invoice_no: inv.invoice_no,
      invoice_date: dateOnlyIso(inv.dispatch_date),
      customer: custMap.get(inv.customer_code) ?? inv.customer_code,
      salesman: salesmanName ?? "",
      salesman_id: inv.salesman_id,
      net_amount: toNum(inv.net_amount),
      dispatch_plan,
      pending_status: status,
    };
  });

  if (filters.status && filters.status !== "All") {
    rows = rows.filter((r) => r.pending_status === filters.status);
  }
  if (filters.salesmanId && filters.salesmanId !== "All") {
    rows = rows.filter((r) => String(r.salesman_id) === filters.salesmanId);
  }
  if (filters.customerCode && filters.customerCode !== "All") {
    rows = rows.filter((r) => {
      const original = allInvoices.find((i) => i.invoice_no === r.invoice_no);
      return original?.customer_code === filters.customerCode;
    });
  }

  const kpis: PendingInvoiceKpis = {
    total_count: rows.length,
    total_amount: rows.reduce((acc, r) => acc + r.net_amount, 0),
    by_status: {
      Unlinked: { count: 0, amount: 0 },
      "For Dispatch": { count: 0, amount: 0 },
      Inbound: { count: 0, amount: 0 },
      Cleared: { count: 0, amount: 0 },
    },
  };

  rows.forEach((r) => {
    if (kpis.by_status[r.pending_status]) {
      kpis.by_status[r.pending_status].count++;
      kpis.by_status[r.pending_status].amount += r.net_amount;
    }
  });

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const start = (page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);

  return { rows: pagedRows, total: rows.length, kpis };
}

// --- Itemized Replica (For Export) ---
export async function fetchItemizedReplica(filters: ListFilters) {
  const listResult = await listPendingInvoices({
    ...filters,
    q: "",
    page: 1,
    pageSize: 100000,
  });

  const validInvoiceIds = new Set(listResult.rows.map((r) => r.id));
  if (validInvoiceIds.size === 0) return [];

  const invoiceIdArray = Array.from(validInvoiceIds);
  const allLines = [];

  for (const batch of chunk(invoiceIdArray, 100)) {
    const detailsRes = await directusGet<DirectusListResponse<any>>("/items/sales_invoice_details", {
      fields: "invoice_no,product_id,unit,quantity,unit_price,total_amount,discount_amount",
      limit: "-1",
      filter: JSON.stringify({ invoice_no: { _in: batch } }),
    });
    if (!(detailsRes instanceof NextResponse) && detailsRes.data) {
      allLines.push(...detailsRes.data);
    }
  }

  const productIds = [...new Set(allLines.map((l) => l.product_id).filter(Boolean))];
  const unitIds = [...new Set(allLines.map((l) => l.unit).filter(Boolean))];

  const [productsRes, unitsRes] = await Promise.all([
    productIds.length > 0 ? directusGet<DirectusListResponse<any>>("/items/products", {
      fields: "product_id,product_name",
      limit: "-1",
      filter: JSON.stringify({ product_id: { _in: productIds } }),
    }) : { data: [] },
    unitIds.length > 0 ? directusGet<DirectusListResponse<any>>("/items/units", {
      fields: "unit_id,unit_name",
      limit: "-1",
      filter: JSON.stringify({ unit_id: { _in: unitIds } }),
    }) : { data: [] }
  ]);

  const prodMap = new Map((!(productsRes instanceof NextResponse) ? (productsRes.data ?? []) : []).map((p: any) => [p.product_id, p.product_name]));
  const unitMap = new Map((!(unitsRes instanceof NextResponse) ? (unitsRes.data ?? []) : []).map((u: any) => [u.unit_id, u.unit_name]));

  const exportRows = [];
  const headersMap = new Map(listResult.rows.map((r) => [r.id, r]));

  for (const line of allLines) {
    const linkId = Number(line.invoice_no);
    const header = headersMap.get(linkId);
    if (!header) continue;

    exportRows.push({
      ...header,
      product_name: prodMap.get(line.product_id) || `Item ${line.product_id}`,
      product_unit: unitMap.get(line.unit) || String(line.unit || ""),
      product_quantity: toNum(line.quantity),
      product_net: toNum(line.total_amount) - toNum(line.discount_amount),
    });
  }

  return exportRows;
}

// --- Invoice Details (Single View) ---
export async function fetchInvoiceDetails(invoiceNo: string) {
  const headRes = await directusGet<DirectusListResponse<any>>("/items/sales_invoice", {
    fields: "*,invoice_type",
    filter: JSON.stringify({ _and: [{ invoice_no: { _eq: invoiceNo } }, { sales_type: { _eq: 1 } }] }),
    limit: "1"
  });
  if (headRes instanceof NextResponse) return null;
  const head = headRes.data?.[0];
  if (!head) return null;

  const [custRes, saleRes, dispatchMap, operationRes, invoiceTypeRes] = await Promise.all([
    directusGet<DirectusListResponse<any>>("/items/customer", { filter: JSON.stringify({ customer_code: { _eq: head.customer_code } }), limit: "1" }),
    directusGet<DirectusListResponse<any>>("/items/salesman", { filter: JSON.stringify({ id: { _eq: head.salesman_id } }), limit: "1" }),
    fetchDispatchPlans([head.invoice_id]),
    directusGet<DirectusListResponse<any>>("/items/operation", {
      fields: "operation_name",
      filter: JSON.stringify({ id: { _eq: head.sales_type } }),
      limit: "1"
    }),
    head.invoice_type ? directusGet<DirectusListResponse<any>>("/items/sales_invoice_type", {
      fields: "type",
      filter: JSON.stringify({ id: { _eq: head.invoice_type } }),
      limit: "1"
    }) : Promise.resolve({ data: [] }),
  ]);

  // ✅ Fetching specific fields for table logic
  const detailsRes = await directusGet<DirectusListResponse<any>>("/items/sales_invoice_details", {
    fields: "*,discount_type,total_amount,discount_amount,unit_price",
    filter: JSON.stringify({ invoice_no: { _eq: head.invoice_id } }),
    limit: "-1"
  });
  const rawLines = !(detailsRes instanceof NextResponse) ? (detailsRes.data ?? []) : [];

  const productIds = [...new Set(rawLines.map((l: any) => l.product_id).filter(Boolean))];
  const unitIds = [...new Set(rawLines.map((l: any) => l.unit).filter(Boolean))];
  const discountTypeIds = [...new Set(rawLines.map((l: any) => l.discount_type).filter(Boolean))];

  const [productsRes, unitsRes, discountsRes] = await Promise.all([
    productIds.length > 0 ? directusGet<DirectusListResponse<any>>("/items/products", { fields: "product_id,product_name", filter: JSON.stringify({ product_id: { _in: productIds } }), limit: "-1" }) : { data: [] },
    unitIds.length > 0 ? directusGet<DirectusListResponse<any>>("/items/units", { fields: "unit_id,unit_name", filter: JSON.stringify({ unit_id: { _in: unitIds } }), limit: "-1" }) : { data: [] },
    discountTypeIds.length > 0 ? directusGet<DirectusListResponse<any>>("/items/discount_type", { fields: "id,discount_type", filter: JSON.stringify({ id: { _in: discountTypeIds } }), limit: "-1" }) : { data: [] },
  ]);

  const prodMap = new Map((!(productsRes instanceof NextResponse) ? (productsRes.data ?? []) : []).map((p: any) => [p.product_id, p.product_name]));
  const unitMap = new Map((!(unitsRes instanceof NextResponse) ? (unitsRes.data ?? []) : []).map((u: any) => [u.unit_id, u.unit_name]));
  const discountMap = new Map((!(discountsRes instanceof NextResponse) ? (discountsRes.data ?? []) : []).map((d: any) => [d.id, d.discount_type]));

  const cust = !(custRes instanceof NextResponse) ? custRes.data?.[0] : null;
  const sale = !(saleRes instanceof NextResponse) ? saleRes.data?.[0] : null;
  const operation = !(operationRes instanceof NextResponse) ? operationRes.data?.[0] : null;
  const invoiceTypeRecord = !(invoiceTypeRes instanceof NextResponse) ? invoiceTypeRes.data?.[0] : null;

  const docs = dispatchMap.get(head.invoice_id) ?? [];
  const dispatch_plan = docs.length ? docs.join(", ") : "unlinked";
  const status = derivePendingStatus(dispatch_plan, head.transaction_status);

  const gross = toNum(head.gross_amount);
  const discount = toNum(head.discount_amount);
  const net = gross - discount;

  return {
    header: {
      invoice_no: head.invoice_no,
      invoice_date: dateOnlyIso(head.dispatch_date),
      dispatch_date: dateOnlyIso(head.dispatch_date),
      customer_code: head.customer_code,
      customer_name: cust?.customer_name,
      address: [cust?.brgy, cust?.city, cust?.province].filter(Boolean).join(", "),
      salesman: sale?.salesman_name ?? "",

      sales_type: operation?.operation_name ?? "Regular",
      invoice_type: invoiceTypeRecord?.type ?? "Unlinked",

      price_type: sale?.price_type,
      status,
      dispatch_plan,
    },
    lines: rawLines.map((l: any, index: number) => {
      const unitPrice = toNum(l.unit_price);
      const qty = toNum(l.quantity);

      // ✅ FETCHED: 'discount_amount' from Directus
      const discAmt = toNum(l.discount_amount);

      // ✅ FETCHED: 'total_amount' from Directus 
      // (Aliases to 'product_total_amount' in your view, so we use this directly for Gross)
      const productTotalAmount = toNum(l.total_amount) + discAmt;

      // ✅ CALCULATED: 'product_net_amount'
      // View definition says: (total_amount - discount_amount)
      const productNetAmount = productTotalAmount - discAmt;

      // ✅ FETCHED: Discount Label
      const discType = discountMap.get(l.discount_type) ?? (discAmt > 0 ? "Discount" : "No Discount");

      return {
        id: l.id ?? `line-${index}`,
        product_id: l.product_id,
        product_name: prodMap.get(l.product_id) || `Item ${l.product_id}`,
        unit: unitMap.get(l.unit) || String(l.unit),
        qty: qty,

        // ✅ Price = Unit Price
        price: unitPrice,

        // ✅ Gross = Total Amount (strictly)
        gross: productTotalAmount,

        // ✅ Disc Type
        disc_type: discType,

        // ✅ Disc Amt
        disc_amt: discAmt,

        // ✅ Net Total = Total - Discount
        net_total: productNetAmount,
      };
    }),
    summary: {
      gross: gross,
      discount: discount,
      vatable: net / 1.12,
      net: net,
      vat: toNum(head.vat_amount),
      total: net,
      balance: net,
    },
  };
}