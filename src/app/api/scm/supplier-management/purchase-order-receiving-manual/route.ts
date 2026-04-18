import { NextRequest, NextResponse } from "next/server";

// =====================
// DIRECTUS HELPERS
// =====================
function getDirectusBase(): string {
    const raw = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const cleaned = raw.trim().replace(/\/$/, "");
    if (!cleaned) throw new Error("DIRECTUS_URL is not set.");
    return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

function getDirectusToken(): string {
    const token = (process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
    if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is not set.");
    return token;
}

function directusHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getDirectusToken()}`,
    };
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { ...directusHeaders(), ...(init?.headers as Record<string, string> | undefined) },
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const errors = json?.errors as Array<{ message: string }> | undefined;
        const msg = errors?.[0]?.message || (json?.error as string) || `Directus error ${res.status} ${res.statusText}`;
        throw new Error(msg);
    }
    return json as T;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// HELPERS (Same as RFID but without RFID tagging gate)
// =====================
function ok(data: unknown, status = 200) { return NextResponse.json({ data }, { status }); }
function bad(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
function toStr(v: unknown, fb = "") { const s = String(v ?? "").trim(); return s ? s : fb; }
function toNum(v: unknown) { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function pickNum(obj: any, keys: string[]) {
    for (const k of keys) if (obj?.[k]) { const n = toNum(obj[k]); if (n) return n; }
    return 0;
}
function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n > 0 && n <= 100);
    if (!nums.length) return 0;
    const f = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - f) * 100).toFixed(4));
}
function keyLine(poId: number, productId: number, branchId: number) { return `${poId}::${productId}::${branchId}`; }

const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const POR_COLLECTION = "purchase_order_receiving";

export async function GET() {
    try {
        const base = getDirectusBase();
        const url = `${base}/items/${PO_COLLECTION}?limit=-1&filter[inventory_status][_in]=3,9,11,12&fields=purchase_order_id,purchase_order_no,supplier_name.supplier_name,total_amount`;
        const j = await fetchJson(url) as any;
        const list = (j?.data ?? []).map((po: any) => ({
             id: String(po.purchase_order_id),
             poNumber: toStr(po.purchase_order_no),
             supplierName: toStr(po.supplier_name?.supplier_name, "—"),
             totalAmount: toNum(po.total_amount),
             status: "OPEN" // Simplified for manual
        }));
        return ok(list);
    } catch (e: any) { return bad(e.message, 500); }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body.action);

        if (action === "open_po") {
             const poId = toNum(body.poId);
             const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=*,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
             const pj = await fetchJson(poUrl) as any;
             const po = pj?.data;

             const linesUrl = `${base}/items/${PO_PRODUCTS_COLLECTION}?filter[purchase_order_id][_eq]=${poId}&fields=*,product_id.product_name,product_id.barcode,product_id.product_code,branch_id.branch_name`;
             const lj = await fetchJson(linesUrl) as any;
             const lines = lj?.data ?? [];

             const porUrl = `${base}/items/${POR_COLLECTION}?filter[purchase_order_id][_eq]=${poId}&fields=*`;
             const prj = await fetchJson(porUrl) as any;
             const porRows = prj?.data ?? [];

             let discountPercent = pickNum(po, ["discount_percent"]);
             const dLines = po.discount_type?.line_per_discount_type || [];
             if (dLines.length > 0) discountPercent = (1 - dLines.reduce((acc: number, l: any) => acc * (1 - toNum(l.line_id?.percentage)/100), 1)) * 100;
             else if (!discountPercent) discountPercent = deriveDiscountPercentFromCode(toStr(po.discount_type?.discount_type));

             const allocations: any[] = [];
             // Group by branch
             const branches = Array.from(new Set(lines.map((l: any) => l.branch_id?.id || 0)));
             for (const bid of branches) {
                 const bLines = lines.filter((l: any) => (l.branch_id?.id || 0) === bid);
                 allocations.push({
                     branch: { id: String(bid), name: bLines[0]?.branch_id?.branch_name || "Unassigned" },
                     items: bLines.map((l: any) => {
                         const pid = toNum(l.product_id?.product_id || l.product_id);
                         const pors = porRows.filter((r: any) => toNum(r.product_id) === pid && (r.branch_id || 0) === bid);
                         const receivedQty = pors.reduce((sum: number, r: any) => sum + toNum(r.received_quantity), 0);
                         return {
                             id: String(pors[0]?.purchase_order_product_id || pid),
                             porId: String(pors[0]?.purchase_order_product_id || ""),
                             productId: String(pid),
                             name: toStr(l.product_id?.product_name),
                             barcode: toStr(l.product_id?.barcode),
                             expectedQty: toNum(l.ordered_quantity),
                             receivedQty,
                             isReceived: receivedQty >= toNum(l.ordered_quantity),
                             unitPrice: toNum(l.unit_price),
                             netAmount: receivedQty * (toNum(l.unit_price) * (1 - discountPercent/100))
                         };
                     })
                 });
             }

             return ok({
                 id: String(poId),
                 poNumber: toStr(po.purchase_order_no),
                 allocations
             });
        }

        if (action === "save_receipt") {
             const { items, receiptNo, receiptDate } = body;
             for (const it of (items || [])) {
                 // For manual, we might need to create POR rows if they don't exist
                 if (it.porId) {
                     await fetchJson(`${base}/items/${POR_COLLECTION}/${it.porId}`, {
                         method: "PATCH",
                         body: JSON.stringify({ receipt_no: receiptNo, receipt_date: receiptDate, received_quantity: it.qty, received_date: new Date().toISOString() })
                     });
                 }
             }
             return ok({ ok: true });
        }

        return bad("Unknown action");
    } catch (e: any) { return bad(e.message, 500); }
}
