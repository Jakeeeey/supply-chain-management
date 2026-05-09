import { NextRequest, NextResponse } from 'next/server';

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

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
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

function toNum(v: unknown) { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function toStr(v: unknown, fb = "") { const s = String(v ?? "").trim(); return s ? s : fb; }

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = getDirectusBase();
    const apiUrl = `${base}/items/purchase_order?limit=-1`;

    const data = await fetchJson(apiUrl);
    return NextResponse.json(data);

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Route Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// =====================
// POST - Fetch PO details (allocations, receipts, tracking)
// =====================
interface PORRow {
    purchase_order_product_id: number | string;
    purchase_order_id: number | string;
    product_id: number | string;
    branch_id: number | string;
    received_quantity: number | string;
    receipt_no: string | null;
    receipt_date: string | null;
    received_date: string | null;
    isPosted: number | string;
    unit_price: number | string;
    discounted_amount: number | string;
    total_amount: number | string;
    batch_no?: string;
    expiry_date?: string;
}

interface POProductRow {
    purchase_order_product_id: number | string;
    purchase_order_id: number | string;
    product_id: number | string;
    branch_id: number | string;
    ordered_quantity: number | string;
    unit_price: number | string;
    total_amount: number | string;
    discounted_price?: number | string;
}

interface ProductRow {
    product_id: number | string;
    product_name?: string;
    barcode?: string;
    product_code?: string;
}

interface BranchRow {
    id: number | string;
    branch_name?: string;
    branch_description?: string;
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body.action);

        if (action === "get_po_details" || action === "get_receipts") {
            const poId = toNum(body.poId);
            if (!poId) return NextResponse.json({ error: "Missing poId" }, { status: 400 });

            // 1. Fetch Ordered Items (Allocations)
            const popUrl = `${base}/items/purchase_order_products?limit=-1&filter[purchase_order_id][_eq]=${poId}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount,discounted_price`;
            const popJson = await fetchJson<{ data: POProductRow[] }>(popUrl);
            const allocationsRows = popJson?.data ?? [];

            // 2. Fetch all receiving rows for this PO
            const porUrl = `${base}/items/purchase_order_receiving?limit=-1&filter[purchase_order_id][_eq]=${poId}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,unit_price,discounted_amount,total_amount,batch_no,expiry_date`;
            const porJson = await fetchJson<{ data: PORRow[] }>(porUrl);
            const porRows = porJson?.data ?? [];

            // Collect unique IDs for metadata
            const productIds = Array.from(new Set([
                ...allocationsRows.map(r => toNum(r.product_id)),
                ...porRows.map(r => toNum(r.product_id))
            ])).filter(Boolean);

            const branchIds = Array.from(new Set([
                ...allocationsRows.map(r => toNum(r.branch_id)),
                ...porRows.map(r => toNum(r.branch_id))
            ])).filter(Boolean);

            // Fetch metadata
            const [productsMap, branchesMap] = await Promise.all([
                (async () => {
                    const map = new Map<number, ProductRow>();
                    if (!productIds.length) return map;
                    for (const ids of chunk(productIds, 250)) {
                        const url = `${base}/items/products?limit=-1&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}&fields=product_id,product_name,barcode,product_code`;
                        const j = await fetchJson<{ data: ProductRow[] }>(url);
                        for (const p of (j?.data ?? [])) map.set(toNum(p.product_id), p);
                    }
                    return map;
                })(),
                (async () => {
                    const map = new Map<number, string>();
                    if (!branchIds.length) return map;
                    for (const ids of chunk(branchIds, 250)) {
                        const url = `${base}/items/branches?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,branch_name,branch_description`;
                        const j = await fetchJson<{ data: BranchRow[] }>(url);
                        for (const b of (j?.data ?? [])) map.set(toNum(b.id), toStr(b.branch_name) || toStr(b.branch_description) || `Branch ${b.id}`);
                    }
                    return map;
                })()
            ]);

            // PROCESS ALLOCATIONS (Master Summary)
            const allocations = allocationsRows.map(row => {
                const pid = toNum(row.product_id);
                const bid = toNum(row.branch_id);
                
                // Aggregate received quantity for this specific (Product, Branch)
                const totalReceived = porRows
                    .filter(r => toNum(r.product_id) === pid && toNum(r.branch_id) === bid)
                    .reduce((sum, r) => sum + toNum(r.received_quantity), 0);

                const product = productsMap.get(pid);
                const unitPrice = toNum(row.unit_price);
                const discAmt = toNum(row.discounted_price || 0);

                return {
                    id: row.purchase_order_product_id,
                    productId: pid,
                    productName: toStr(product?.product_name, `Product #${pid}`),
                    branchName: branchesMap.get(bid) || `Branch ${bid}`,
                    orderedQty: toNum(row.ordered_quantity),
                    receivedQty: totalReceived,
                    unitPrice,
                    discount: discAmt, // This might be total discount for that line
                    total: toNum(row.total_amount),
                    status: totalReceived >= toNum(row.ordered_quantity) ? "FULFILLED" : (totalReceived > 0 ? "PARTIAL" : "OPEN")
                };
            });

            // PROCESS RECEIPTS (Transaction History)
            const receivedRows = porRows.filter(r => toStr(r.receipt_no));
            const receiptMap = new Map<string, { receiptNo: string; receiptDate: string; isPosted: boolean; items: { productName: string; branchName: string; quantity: number; unitPrice: number; discount: number; total: number; batchNo: string; expiryDate: string; }[]; }>();

            for (const row of receivedRows) {
                const rno = toStr(row.receipt_no);
                if (!receiptMap.has(rno)) {
                    receiptMap.set(rno, {
                        receiptNo: rno,
                        receiptDate: toStr(row.receipt_date || row.received_date),
                        isPosted: toNum(row.isPosted) === 1,
                        items: [],
                    });
                }
                const receipt = receiptMap.get(rno)!;
                const product = productsMap.get(toNum(row.product_id));
                receipt.items.push({
                    productName: toStr(product?.product_name, `Product #${row.product_id}`),
                    branchName: branchesMap.get(toNum(row.branch_id)) || `Branch ${row.branch_id}`,
                    quantity: toNum(row.received_quantity),
                    unitPrice: toNum(row.unit_price),
                    discount: toNum(row.discounted_amount),
                    total: toNum(row.total_amount),
                    batchNo: toStr(row.batch_no),
                    expiryDate: toStr(row.expiry_date),
                });
                if (toNum(row.isPosted) !== 1) receipt.isPosted = false;
            }

            const receipts = Array.from(receiptMap.values()).sort((a, b) => b.receiptNo.localeCompare(a.receiptNo));

            return NextResponse.json({ data: { allocations, receipts } });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("POST Route Error:", err);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}