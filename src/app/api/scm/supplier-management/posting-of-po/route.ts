import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// DIRECTUS CONFIG
// =====================
function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    const cleaned = String(raw || "").trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(cleaned)) return `http://${cleaned}`;
    return cleaned;
}

function getServerToken() {
    return String(process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
}

function buildHeaders() {
    const token = getServerToken();
    if (!token) throw new Error("DIRECTUS_STATIC_TOKEN (or DIRECTUS_TOKEN) is missing.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, {
        ...init,
        headers: { ...(buildHeaders() as any), ...(init?.headers ?? {}) },
        cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = j?.errors?.[0]?.message || j?.error || `Upstream failed: ${r.status}`;
        throw new Error(msg);
    }
    return j;
}

function ok(data: any, status = 200) {
    return NextResponse.json({ data }, { status });
}
function bad(error: string, status = 400) {
    return NextResponse.json({ error }, { status });
}
function toStr(v: any, fb = "") {
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: any) {
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

// =====================
// COLLECTIONS
// =====================
const PO_COLLECTION = "purchase_order";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const BRANCHES_COLLECTION = "branches";

const POR_COLLECTION = "purchase_order_receiving";
const POR_ITEMS_COLLECTION = "purchase_order_receiving_items";

// =====================
// HELPERS
// =====================
function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(supplierIds.filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: any[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,supplier_name`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }

    for (const s of rows) {
        const id = toNum(s?.id);
        if (!id) continue;
        map.set(id, toStr(s?.supplier_name, "—"));
    }
    return map;
}

async function fetchBranchesMap(base: string, branchIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(branchIds.filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: any[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${BRANCHES_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,branch_name,branch_description`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }

    for (const b of rows) {
        const id = toNum(b?.id);
        if (!id) continue;
        map.set(id, toStr(b?.branch_name) || toStr(b?.branch_description) || `Branch ${id}`);
    }
    return map;
}

async function fetchProductsMap(base: string, productIds: number[]) {
    const map = new Map<number, any>();
    const uniq = Array.from(new Set(productIds.filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: any[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=product_id,product_name,barcode,product_code`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }

    for (const p of rows) {
        const id = toNum(p?.product_id ?? p?.id);
        if (!id) continue;
        map.set(id, {
            product_id: id,
            product_name: toStr(p?.product_name, `Product #${id}`),
            barcode: toStr(p?.barcode),
            product_code: toStr(p?.product_code),
        });
    }
    return map;
}

function productDisplayCode(p: any, productId: number) {
    return toStr(p?.barcode) || toStr(p?.product_code) || String(productId);
}

// =====================
// ROUTES
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();

        // ✅ List only POs that have at least 1 UNPOSTED receipt
        const porUrl =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[receipt_no][_nnull]=true` +
            `&filter[isPosted][_eq]=0` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted`;
        const porJ = await fetchJson(porUrl);
        const porRows: any[] = Array.isArray(porJ?.data) ? porJ.data : [];
        if (!porRows.length) return ok([]);

        const poIds = Array.from(new Set(porRows.map((r) => toNum(r?.purchase_order_id)).filter(Boolean)));
        if (!poIds.length) return ok([]);

        const poHeaders: any[] = [];
        for (const ids of chunk(poIds, 250)) {
            const url =
                `${base}/items/${PO_COLLECTION}?limit=-1` +
                `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
                `&fields=purchase_order_id,purchase_order_no,supplier_name,total_amount,date_received,date_encoded,date`;
            const j = await fetchJson(url);
            poHeaders.push(...(Array.isArray(j?.data) ? j.data : []));
        }

        const supplierIds = poHeaders.map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierMap = await fetchSupplierNames(base, supplierIds);

        // group por by poId
        const porByPo = new Map<number, any[]>();
        for (const r of porRows) {
            const poId = toNum(r?.purchase_order_id);
            if (!poId) continue;
            const arr = porByPo.get(poId) ?? [];
            arr.push(r);
            porByPo.set(poId, arr);
        }

        const list = poHeaders.map((po) => {
            const poId = toNum(po?.purchase_order_id);
            const poNumber = toStr(po?.purchase_order_no, String(poId));
            const sid = toNum(po?.supplier_name);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";

            const rows = porByPo.get(poId) ?? [];
            const products = new Set<number>();
            const branches = new Set<number>();
            const receipts = new Set<string>();
            const unpostedReceipts = new Set<string>();

            for (const r of rows) {
                products.add(toNum(r?.product_id));
                branches.add(toNum(r?.branch_id));
                const rn = toStr(r?.receipt_no);
                if (rn) {
                    receipts.add(rn);
                    if (toNum(r?.isPosted) !== 1) unpostedReceipts.add(rn);
                }
            }

            const status: "OPEN" | "PARTIAL" | "CLOSED" = toStr(po?.date_received) ? "CLOSED" : "PARTIAL";

            return {
                id: String(poId),
                poNumber,
                supplierName,
                status,
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                itemsCount: Array.from(products).filter(Boolean).length,
                branchesCount: Array.from(branches).filter(Boolean).length,
                receiptsCount: receipts.size,
                unpostedReceiptsCount: unpostedReceipts.size,
            };
        });

        // newest first-ish
        list.sort((a: any, b: any) => (a.poNumber < b.poNumber ? 1 : -1));

        return ok(list);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed to load list"), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        if (action === "open_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl =
                `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
                `?fields=purchase_order_id,purchase_order_no,supplier_name,total_amount,date_received,date_encoded,date`;
            const poJ = await fetchJson(poUrl);
            const po = poJ?.data ?? null;
            if (!po) return bad("PO not found.", 404);

            const porUrl =
                `${base}/items/${POR_COLLECTION}?limit=-1` +
                `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
                `&filter[receipt_no][_nnull]=true` +
                `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted`;
            const porJ = await fetchJson(porUrl);
            const porRows: any[] = Array.isArray(porJ?.data) ? porJ.data : [];

            const sid = toNum(po?.supplier_name);
            const supplierMap = await fetchSupplierNames(base, sid ? [sid] : []);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";

            const productIds = Array.from(new Set(porRows.map((r) => toNum(r?.product_id)).filter(Boolean)));
            const branchIds = Array.from(new Set(porRows.map((r) => toNum(r?.branch_id)).filter(Boolean)));
            const productsMap = await fetchProductsMap(base, productIds);
            const branchesMap = await fetchBranchesMap(base, branchIds);

            // expectedQty = tagged RFIDs count (from POR_ITEMS)
            const porIds = porRows.map((r) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const taggedCountByPorId = new Map<number, number>();
            if (porIds.length) {
                const itemsUrl =
                    `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1` +
                    `&filter[purchase_order_product_id][_in]=${encodeURIComponent(porIds.join(","))}` +
                    `&fields=receiving_item_id,purchase_order_product_id`;
                const itemsJ = await fetchJson(itemsUrl);
                const rows = Array.isArray(itemsJ?.data) ? itemsJ.data : [];
                for (const it of rows) {
                    const pid = toNum(it?.purchase_order_product_id);
                    if (!pid) continue;
                    taggedCountByPorId.set(pid, (taggedCountByPorId.get(pid) ?? 0) + 1);
                }
            }

            // allocations by branch
            const itemsByBranch = new Map<number, any[]>();
            for (const r of porRows) {
                const porId = toNum(r?.purchase_order_product_id);
                const pid = toNum(r?.product_id);
                const bid = toNum(r?.branch_id);

                const p = pid ? productsMap.get(pid) : null;

                const expectedQty = porId ? (taggedCountByPorId.get(porId) ?? 0) : 0;
                const receivedQty = Math.max(0, toNum(r?.received_quantity ?? 0));

                const item = {
                    id: String(porId),
                    productId: String(pid || ""),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: "—",
                    expectedQty,
                    receivedQty,
                    requiresRfid: true,
                };

                const arr = itemsByBranch.get(bid) ?? [];
                arr.push(item);
                itemsByBranch.set(bid, arr);
            }

            const allocations = Array.from(itemsByBranch.entries()).map(([bid, items]) => ({
                branch: {
                    id: bid ? String(bid) : "unassigned",
                    name: bid ? toStr(branchesMap.get(bid), `Branch ${bid}`) : "Unassigned",
                },
                items,
            }));

            // receipts grouping
            const byReceipt = new Map<string, any[]>();
            for (const r of porRows) {
                const rn = toStr(r?.receipt_no);
                if (!rn) continue;
                const arr = byReceipt.get(rn) ?? [];
                arr.push(r);
                byReceipt.set(rn, arr);
            }

            const receipts = Array.from(byReceipt.entries()).map(([receiptNo, rows]) => {
                const anyRow = rows[0] ?? {};
                const receiptDate = toStr(anyRow?.receipt_date) || toStr(anyRow?.received_date) || "";
                const receivedAt = toStr(anyRow?.received_date) || "";
                const isPosted = rows.every((x) => toNum(x?.isPosted) === 1);
                const linesCount = rows.length;
                const totalReceivedQty = rows.reduce((a, b) => a + Math.max(0, toNum(b?.received_quantity ?? 0)), 0);
                return { receiptNo, receiptDate, receivedAt, isPosted, linesCount, totalReceivedQty };
            });

            const status: "OPEN" | "PARTIAL" | "CLOSED" = toStr(po?.date_received) ? "CLOSED" : "PARTIAL";

            return ok({
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no, String(poId)),
                supplier: { id: String(sid || ""), name: supplierName },
                status,
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                allocations,
                receipts: receipts.sort((a, b) => (a.receiptNo < b.receiptNo ? 1 : -1)),
                createdAt: toStr(po?.date_encoded || po?.date || "", ""),
            });
        }

        if (action === "post_receipt") {
            const poId = toNum(body?.poId);
            const receiptNo = toStr(body?.receiptNo);
            if (!poId) return bad("Missing poId.", 400);
            if (!receiptNo) return bad("Missing receiptNo.", 400);

            const porUrl =
                `${base}/items/${POR_COLLECTION}?limit=-1` +
                `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
                `&filter[receipt_no][_eq]=${encodeURIComponent(receiptNo)}` +
                `&filter[isPosted][_eq]=0` +
                `&fields=purchase_order_product_id`;
            const j = await fetchJson(porUrl);
            const rows: any[] = Array.isArray(j?.data) ? j.data : [];
            const ids = rows.map((r) => toNum(r?.purchase_order_product_id)).filter(Boolean);

            for (const id of ids) {
                const patchUrl = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(id))}`;
                await fetchJson(patchUrl, { method: "PATCH", body: JSON.stringify({ isPosted: 1 }) });
            }

            return ok({ ok: true });
        }

        if (action === "post_all") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const porUrl =
                `${base}/items/${POR_COLLECTION}?limit=-1` +
                `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
                `&filter[receipt_no][_nnull]=true` +
                `&filter[isPosted][_eq]=0` +
                `&fields=purchase_order_product_id`;
            const j = await fetchJson(porUrl);
            const rows: any[] = Array.isArray(j?.data) ? j.data : [];
            const ids = rows.map((r) => toNum(r?.purchase_order_product_id)).filter(Boolean);

            for (const id of ids) {
                const patchUrl = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(id))}`;
                await fetchJson(patchUrl, { method: "PATCH", body: JSON.stringify({ isPosted: 1 }) });
            }

            return ok({ ok: true });
        }

        return bad("Unknown action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Request failed"), 500);
    }
}
