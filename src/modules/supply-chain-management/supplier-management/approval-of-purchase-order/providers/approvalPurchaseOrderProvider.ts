import type { PendingApprovalPO, PurchaseOrderDetail, PaymentTerm } from "../types";

const API = "/api/scm/supplier-management/approval-of-po";

function toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function unwrapData<T>(json: any): T {
    return (json?.data ?? json) as T;
}

function unwrapDeep<T>(json: any): T {
    const a: any = unwrapData<any>(json);
    const b: any = unwrapData<any>(a);
    return (b ?? a ?? json) as T;
}

export async function fetchPendingApprovalPOs(): Promise<PendingApprovalPO[]> {
    const res = await fetch(API, { method: "GET", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to fetch pending POs");

    const rows = unwrapDeep<any[]>(json) ?? [];

    return rows.map((r) => ({
        ...r,
        id: String(r?.id ?? r?.purchase_order_id ?? ""),
    })) as any;
}

export async function fetchPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
        method: "GET",
        credentials: "include",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to fetch PO detail");

    const d: any = unwrapDeep<any>(json) ?? {};

    const gross = toNum(d?.gross_amount ?? d?.grossAmount);
    const disc = toNum(d?.discounted_amount ?? d?.discountAmount);
    const vat = toNum(d?.vat_amount ?? d?.vatAmount);
    const ewt = toNum(d?.withholding_tax_amount ?? d?.ewtGoods);
    const total = toNum(d?.total_amount ?? d?.total);

    return {
        ...d,
        id: String(d?.purchase_order_id ?? d?.id ?? id),
        purchase_order_id: d?.purchase_order_id ?? d?.id ?? id,
        purchase_order_no: d?.purchase_order_no ?? d?.poNumber ?? d?.purchase_order_no,

        gross_amount: gross,
        discounted_amount: disc,
        vat_amount: vat,
        withholding_tax_amount: ewt,
        total_amount: total,

        // duplicates for safety
        grossAmount: gross,
        discountAmount: disc,
        vatAmount: vat,
        ewtGoods: ewt,
        total: total,
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
