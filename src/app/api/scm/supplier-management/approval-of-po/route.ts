import { NextRequest, NextResponse } from "next/server";

import type {
    TaggablePOListItem,
    TaggingPODetail,
    TaggingPOItem,
    TaggingActivity,
} from "@/modules/supply-chain-management/supplier-management/tagging-of-po/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// DIRECTUS CONFIG (match approval-of-po style)
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

/** ✅ ALWAYS use server/static token to avoid Directus role field stripping */
function getServerToken() {
    return String(process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
}

function buildHeaders() {
    const token = getServerToken();
    if (!token) {
        throw new Error(
            "DIRECTUS_STATIC_TOKEN (or DIRECTUS_TOKEN) is missing. Add it to .env.local then restart dev server."
        );
    }
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, {
        ...init,
        headers: {
            ...(buildHeaders() as any),
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = j?.errors?.[0]?.message || j?.error || `Upstream failed: ${r.status}`;
        throw new Error(msg);
    }
    return j;
}

// =====================
// CONSTS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const RECEIVING_ITEMS_COLLECTION = "purchase_order_receiving_items";

const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";

const PO_STATUS_PARTIAL = Number(process.env.PO_STATUS_PARTIAL ?? 2);
const PO_STATUS_RECEIVED = Number(process.env.PO_STATUS_RECEIVED ?? 3);

// =====================
// HELPERS
// =====================
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
function nowISO() {
    return new Date().toISOString();
}
function timeDisplay(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// product helpers
function productName(p: any) {
    return toStr(p?.product_name) || toStr(p?.name) || "Unknown";
}
function productPrimarySku(p: any) {
    // ✅ prefer barcode (scanner), then product_code, then product_id fallback
    return toStr(p?.barcode) || toStr(p?.product_code) || "";
}
function productAllCodes(p: any) {
    const a = toStr(p?.barcode);
    const b = toStr(p?.product_code);
    const c = toStr(p?.sku);
    return [a, b, c].filter(Boolean);
}

// =====================
// FETCH MAPS (fast + field-safe)
// =====================
async function fetchSuppliersMapByIds(base: string, supplierIds: number[]) {
    const map = new Map<number, any>();
    const uniq = Array.from(new Set((supplierIds || []).filter(Boolean)));
    if (!uniq.length) return map;

    const url =
        `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
        `&filter[id][_in]=${encodeURIComponent(uniq.join(","))}` +
        `&fields=id,supplier_name,ap_balance`;

    const j = await fetchJson(url);
    for (const s of j?.data ?? []) {
        const id = Number(s?.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        map.set(id, {
            id,
            supplier_name: toStr(s?.supplier_name, "—"),
            ap_balance: Number(s?.ap_balance ?? 0) || 0,
        });
    }
    return map;
}

async function fetchProductsMapByIds(base: string, productIds: number[]) {
    const map = new Map<number, any>();
    const uniq = Array.from(new Set((productIds || []).filter(Boolean)));
    if (!uniq.length) return map;

    const url =
        `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(uniq.join(","))}` +
        `&fields=product_id,product_name,barcode,product_code`;

    const j = await fetchJson(url);
    for (const p of j?.data ?? []) {
        const id = Number(p?.product_id ?? p?.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        map.set(id, {
            product_id: id,
            product_name: toStr(p?.product_name, `Product ${id}`),
            barcode: toStr(p?.barcode),
            product_code: toStr(p?.product_code),
        });
    }
    return map;
}

// =====================
// FETCHERS
// =====================
async function fetchApprovedPOs(base: string) {
    // keep your "approved-ish" rules
    const qs = [
        "limit=-1",
        "sort=-date_encoded",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,approver_id,date_approved,payment_status,inventory_status,date_received,supplier_name",
        "filter[_or][0][date_approved][_nnull]=true",
        "filter[_or][1][approver_id][_nnull]=true",
        "filter[_or][2][payment_status][_eq]=2",
        "filter[date_received][_null]=true",
    ].join("&");

    const url = `${base}/items/${PO_COLLECTION}?${qs}`;
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

type PoProductRow = {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    received?: number | null;
    branch_id?: number | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

type ReceivingRow = {
    receiving_item_id: number;
    purchase_order_product_id: number;
    product_id: number;
    rfid_code: string;
    created_at: string;
};

async function fetchReceivingByPopIds(base: string, popIds: number[]) {
    if (!popIds.length) return [] as ReceivingRow[];

    const url =
        `${base}/items/${RECEIVING_ITEMS_COLLECTION}?limit=-1` +
        `&sort=-created_at` +
        `&filter[purchase_order_product_id][_in]=${encodeURIComponent(popIds.join(","))}` +
        `&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as ReceivingRow[];
}

async function isRfidExistsAnywhere(base: string, rfid: string) {
    const url =
        `${base}/items/${RECEIVING_ITEMS_COLLECTION}?limit=1` +
        `&filter[rfid_code][_eq]=${encodeURIComponent(rfid)}` +
        `&fields=receiving_item_id`;

    const j = await fetchJson(url);
    return Array.isArray(j?.data) && j.data.length > 0;
}

// =====================
// DETAIL BUILDER
// =====================
async function buildDetail(base: string, poId: number): Promise<TaggingPODetail> {
    const headerUrl =
        `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
        `?fields=purchase_order_id,purchase_order_no,supplier_name`;

    const headerJ = await fetchJson(headerUrl);
    const header = headerJ?.data ?? null;

    const poNumber = toStr(header?.purchase_order_no, String(poId));

    const supplierId = toNum(header?.supplier_name);
    const suppliersMap = await fetchSuppliersMapByIds(base, supplierId ? [supplierId] : []);
    const supplierName = supplierId ? toStr(suppliersMap.get(supplierId)?.supplier_name, "—") : "—";

    const poProducts = await fetchPOProductsByPOId(base, poId);

    const popIds = poProducts.map((x) => toNum(x.purchase_order_product_id)).filter(Boolean);
    const productIds = Array.from(new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean)));

    const productsMap = await fetchProductsMapByIds(base, productIds);
    const receiving = await fetchReceivingByPopIds(base, popIds);

    // count tagged per POP id
    const taggedByPopId = new Map<number, number>();
    for (const r of receiving) {
        const pop = toNum(r?.purchase_order_product_id);
        if (!pop) continue;
        taggedByPopId.set(pop, (taggedByPopId.get(pop) ?? 0) + 1);
    }

    const items: TaggingPOItem[] = poProducts.map((line) => {
        const pid = toNum(line.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const scan = p ? productPrimarySku(p) : "";
        const sku = scan || String(pid || line.product_id);

        return {
            id: String(line.purchase_order_product_id),
            sku,
            name: p ? productName(p) : `Product #${pid || line.product_id}`,
            expectedQty: Math.max(0, toNum(line.ordered_quantity)),
            taggedQty: taggedByPopId.get(toNum(line.purchase_order_product_id)) ?? 0,
        };
    });

    const activity: TaggingActivity[] = receiving.map((r) => {
        const pid = toNum(r.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const scan = p ? productPrimarySku(p) : "";
        const sku = scan || String(pid);

        return {
            id: String(r.receiving_item_id),
            sku,
            productName: p ? productName(p) : `Product #${pid}`,
            rfid: toStr(r.rfid_code),
            time: timeDisplay(toStr(r.created_at, nowISO())),
        };
    });

    return {
        id: String(poId),
        poNumber,
        supplierName,
        items,
        activity: activity.slice(0, 50),
    };
}

async function updatePOStatus(base: string, poId: number, detail: TaggingPODetail) {
    const totalExpected = detail.items.reduce((a, b) => a + (b.expectedQty || 0), 0);
    const totalTagged = detail.items.reduce((a, b) => a + (b.taggedQty || 0), 0);

    if (!totalExpected) return;

    const patch: any = {};
    if (totalTagged >= totalExpected) {
        patch.inventory_status = PO_STATUS_RECEIVED;
        patch.date_received = nowISO();
    } else if (totalTagged > 0) {
        patch.inventory_status = PO_STATUS_PARTIAL;
        patch.date_received = null;
    } else {
        return;
    }

    const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
}

async function patchReceivedQty(base: string, popId: number, receivedQty: number) {
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}/${encodeURIComponent(String(popId))}`;
    await fetchJson(url, {
        method: "PATCH",
        body: JSON.stringify({ received: receivedQty }),
    }).catch(() => {});
}

// =====================
// ROUTE HANDLERS
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();

        const rows = await fetchApprovedPOs(base);
        const poIds = rows.map((r: any) => toNum(r?.purchase_order_id)).filter(Boolean);

        const poProducts = await fetchPOProductsByPOIds(base, poIds);

        // expected totals and pop -> po
        const expectedByPo = new Map<number, number>();
        const popIdToPoId = new Map<number, number>();
        const allPopIds: number[] = [];

        for (const line of poProducts) {
            const poId = toNum(line.purchase_order_id);
            const popId = toNum(line.purchase_order_product_id);
            if (!poId || !popId) continue;

            popIdToPoId.set(popId, poId);
            allPopIds.push(popId);

            expectedByPo.set(
                poId,
                (expectedByPo.get(poId) ?? 0) + Math.max(0, toNum(line.ordered_quantity))
            );
        }

        const receiving = await fetchReceivingByPopIds(base, allPopIds);

        const taggedByPo = new Map<number, number>();
        for (const r of receiving) {
            const popId = toNum(r.purchase_order_product_id);
            const poId = popIdToPoId.get(popId);
            if (!poId) continue;
            taggedByPo.set(poId, (taggedByPo.get(poId) ?? 0) + 1);
        }

        // suppliers map
        const supplierIds = rows.map((r: any) => toNum(r?.supplier_name)).filter(Boolean);
        const suppliersMap = await fetchSuppliersMapByIds(base, supplierIds);

        const list: TaggablePOListItem[] = rows.map((r: any) => {
            const poId = toNum(r?.purchase_order_id);
            const totalItems = expectedByPo.get(poId) ?? 0;
            const taggedItems = taggedByPo.get(poId) ?? 0;

            const sid = toNum(r?.supplier_name);
            const supplierName = sid ? toStr(suppliersMap.get(sid)?.supplier_name, "—") : "—";

            return {
                id: String(poId),
                poNumber: toStr(r?.purchase_order_no, String(poId)),
                supplierName,
                date: toStr(r?.date ?? r?.date_encoded, "—"),
                totalItems,
                taggedItems,
                status: totalItems > 0 && taggedItems >= totalItems ? "completed" : "tagging",
            };
        });

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

        if (action === "detail") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const detail = await buildDetail(base, poId);
            return ok(detail);
        }

        if (action === "tag_item") {
            const poId = toNum(body?.poId);
            const sku = toStr(body?.sku);
            const rfid = toStr(body?.rfid);
            const strict = Boolean(body?.strict);

            if (!poId) return bad("Missing poId.", 400);
            if (!sku) return bad("Missing sku/barcode/product_code.", 400);
            if (!rfid) return bad("Missing rfid.", 400);

            // ✅ Global RFID uniqueness check
            const exists = await isRfidExistsAnywhere(base, rfid);
            if (exists) return bad("RFID already exists in receiving items.", 400);

            const poProducts = await fetchPOProductsByPOId(base, poId);
            const productIds = Array.from(new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean)));
            const productsMap = await fetchProductsMapByIds(base, productIds);

            // find matching line by barcode/product_code (or fallback product_id)
            const line = poProducts.find((ln) => {
                const pid = toNum(ln.product_id);
                const p = pid ? productsMap.get(pid) : null;

                if (p) {
                    const codes = productAllCodes(p);
                    if (codes.some((c) => c.toLowerCase() === sku.toLowerCase())) return true;
                    const primary = productPrimarySku(p);
                    if (primary && primary.toLowerCase() === sku.toLowerCase()) return true;
                }

                return String(pid) === sku;
            });

            if (strict && !line) return bad(`Invalid SKU '${sku}' for this PO.`, 400);
            if (!line) return bad(`SKU '${sku}' not found in this PO.`, 400);

            // check not exceed expected
            const current = await buildDetail(base, poId);
            const currentItem = current.items.find((x) => x.id === String(line.purchase_order_product_id));
            if (!currentItem) return bad("Unable to resolve tagging line.", 400);

            if ((currentItem.taggedQty ?? 0) + 1 > (currentItem.expectedQty ?? 0)) {
                return bad("Tagging exceeds expected quantity for this SKU.", 400);
            }

            // insert receiving item
            const insertUrl = `${base}/items/${RECEIVING_ITEMS_COLLECTION}`;
            await fetchJson(insertUrl, {
                method: "POST",
                body: JSON.stringify({
                    purchase_order_product_id: toNum(line.purchase_order_product_id),
                    product_id: toNum(line.product_id),
                    rfid_code: rfid,
                }),
            });

            const updated = await buildDetail(base, poId);

            // patch received qty (optional)
            const updatedLine = updated.items.find((x) => x.id === String(line.purchase_order_product_id));
            if (updatedLine) {
                await patchReceivedQty(base, toNum(line.purchase_order_product_id), toNum(updatedLine.taggedQty));
            }

            // update PO status (partial/received)
            await updatePOStatus(base, poId, updated);

            return ok(updated);
        }

        return bad("Invalid action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Request failed"), 400);
    }
}
