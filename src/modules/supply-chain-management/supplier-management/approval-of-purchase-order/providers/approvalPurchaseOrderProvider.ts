/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PendingApprovalPO, PurchaseOrderDetail, PaymentTerm } from "../types";

const API = "/api/scm/supplier-management/approval-of-po";

function toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function toStr(v: any, fb = ""): string {
    const s = String(v ?? "").trim();
    return s ? s : fb;
}

function unwrapData<T>(json: unknown): T {
    return (json as Record<string, unknown>)?.data as T ?? json as T;
}

function unwrapDeep<T>(json: unknown): T {
    const a: unknown = unwrapData<unknown>(json);
    const b: unknown = unwrapData<unknown>(a);
    return (b ?? a ?? json) as T;
}

 
function normalizeLine(line: any) {
    const qty = toNum(line?.ordered_quantity ?? line?.expectedQty ?? line?.qty ?? line?.quantity);
    const unit = toNum(line?.unit_price ?? line?.unitPrice ?? line?.price);
    const lineTotal = qty * unit;

    return {
        ...line,
        ordered_quantity: qty,
        expectedQty: qty,
        qty: qty,
        quantity: qty,
        unit_price: unit,
        unitPrice: unit,
        price: unit,
        uom: toStr(line?.uom, "—"),
        line_total: toNum(line?.line_total) || lineTotal,
        lineTotal: toNum(line?.lineTotal) || lineTotal,
    };
}

export async function fetchPendingApprovalPOs(): Promise<PendingApprovalPO[]> {
    const res = await fetch(API, { 
        method: "GET", 
        credentials: "include",
        cache: "no-store"
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to fetch pending POs");

     
    const rows = unwrapDeep<any[]>(json) ?? [];

    return rows.map((r) => ({
        ...r,
        id: String(r?.id ?? r?.purchase_order_id ?? ""),
        poNumber: r?.poNumber ?? r?.purchase_order_no ?? r?.purchase_order_no ?? "",
        supplierName: r?.supplierName ?? r?.supplier_name ?? r?.supplierName ?? "",
        branchName: r?.branchName ?? r?.branch_name ?? r?.branch ?? "—",
        date: r?.date ?? r?.date_encoded ?? "—",
     
    })) as any;
}

export async function fetchPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to fetch PO detail");

     
    const d: any = unwrapDeep<any>(json) ?? {};

    // totals
    const gross = toNum(d?.gross_amount ?? d?.grossAmount ?? d?.subtotal);
    let discAmt = toNum(d?.discounted_amount ?? d?.discountAmount ?? d?.discount_amount ?? d?.discount_value);

    let discPct = toNum(d?.discount_percent ?? d?.discountPercent ?? d?.discount_rate ?? d?.discountRate);
    if (!discAmt && discPct > 0 && gross > 0) discAmt = (gross * discPct) / 100;
    if (!discPct && discAmt > 0 && gross > 0) discPct = (discAmt / gross) * 100;

    const vat = toNum(d?.vat_amount ?? d?.vatAmount ?? d?.vat);
    const ewt = toNum(d?.withholding_tax_amount ?? d?.ewtGoods ?? d?.ewt_amount);
    const total = toNum(d?.total_amount ?? d?.total);

    // normalize items & allocations for pricing display
    const items = Array.isArray(d?.items) ? d.items.map(normalizeLine) : [];
    const allocations = Array.isArray(d?.allocations)
         
        ? d.allocations.map((a: any) => ({
            ...a,
            items: Array.isArray(a?.items) ? a.items.map(normalizeLine) : [],
        }))
        : [];

    return {
        ...d,
        id: String(d?.purchase_order_id ?? d?.id ?? id),
        purchase_order_id: d?.purchase_order_id ?? d?.id ?? id,
        purchase_order_no: d?.purchase_order_no ?? d?.poNumber ?? d?.purchase_order_no,

        // branch display
        branchName: d?.branchName ?? d?.branch_name ?? d?.branch?.name ?? "—",

        // supplier display
        supplierName: d?.supplierName ?? d?.supplier?.name ?? d?.supplierName ?? "",

        // financials
        gross_amount: gross,
        discounted_amount: discAmt,
        discount_percent: discPct,
        vat_amount: vat,
        withholding_tax_amount: ewt,
        total_amount: total,

        // duplicates for safety
        grossAmount: gross,
        discountAmount: discAmt,
        discountPercent: discPct,
        vatAmount: vat,
        ewtGoods: ewt,
        total: total,

        // normalized collections
        items,
        allocations,
     
    } as any;
}

// ✅ MUST exist (fix your import error)
export async function approvePurchaseOrder(payload: {
    id: string;
    markAsInvoice: boolean;
    paymentTerm: PaymentTerm;
    termsDays?: number;
}) {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to approve PO");

    return unwrapDeep(json);
}
