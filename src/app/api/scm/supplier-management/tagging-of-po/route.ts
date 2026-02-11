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
// DIRECTUS CONFIG
// =====================
const DIRECTUS_URL =
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.DIRECTUS_URL ||
    "http://100.110.197.61:8056";

const DIRECTUS_BASE = DIRECTUS_URL.replace(/\/+$/, "");

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const RECEIVING_ITEMS_COLLECTION = "purchase_order_receiving_items";

const PRODUCT_COLLECTIONS = (
    process.env.DIRECTUS_PRODUCT_COLLECTIONS || "products"
)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const PRODUCT_PK_FIELD = process.env.DIRECTUS_PRODUCT_PK_FIELD || "product_id";

const PO_STATUS_PARTIAL = Number(process.env.PO_STATUS_PARTIAL ?? 2);
const PO_STATUS_RECEIVED = Number(process.env.PO_STATUS_RECEIVED ?? 3);

const DIRECTUS_ENABLED = Boolean(DIRECTUS_BASE && DIRECTUS_TOKEN);

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

async function dFetch(path: string, init?: RequestInit) {
    const url = `${DIRECTUS_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
    return fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });
}

// =====================
// TYPES
// =====================
type PoProductRow = {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    received?: number | null;
};

type ReceivingRow = {
    receiving_item_id: number;
    purchase_order_product_id: number;
    product_id: number;
    rfid_code: string;
    created_at: string;
};

type ProductRow = {
    product_id?: number;
    id?: number;
    barcode?: string;
    product_code?: string;
    sku?: string;
    name?: string;
    product_name?: string;
};

// =====================
// PRODUCT HELPERS
// =====================
function productScanCodes(p: ProductRow) {
    // ✅ accept any of these as “SKU scan”
    const a = toStr(p?.barcode);
    const b = toStr(p?.product_code);
    const c = toStr(p?.sku);
    return [a, b, c].filter(Boolean);
}

function productPrimaryScanCode(p: ProductRow) {
    // prefer barcode, then product_code
    return toStr(p?.barcode) || toStr(p?.product_code) || toStr(p?.sku) || "";
}

function productName(p: ProductRow) {
    return toStr(p?.product_name) || toStr(p?.name) || "Unknown";
}

// =====================
// FETCHERS
// =====================
async function fetchApprovedPOs() {
    const qs = [
        "limit=50",
        "sort=-date_encoded",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,approver_id,date_approved,payment_status,inventory_status,date_received,supplier_name.supplier_name,supplier_name.name",
        // ✅ approved-ish (tweak later if you add real approval flag)
        "filter[_or][0][date_approved][_nnull]=true",
        "filter[_or][1][approver_id][_nnull]=true",
        "filter[_or][2][payment_status][_eq]=2",
        // ✅ not yet fully received
        "filter[date_received][_null]=true",
    ].join("&");

    const res = await dFetch(`/items/${PO_COLLECTION}?${qs}`, { method: "GET" });
    if (!res.ok) throw new Error("Failed to load purchase orders.");
    const j = await res.json().catch(() => ({}));
    return (j?.data ?? []) as any[];
}

async function fetchPOProductsByPOIds(poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];

    const qs = [
        "limit=-1",
        "fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received",
        `filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}`,
    ].join("&");

    const res = await dFetch(`/items/${PO_PRODUCTS_COLLECTION}?${qs}`, {
        method: "GET",
    });
    if (!res.ok) throw new Error("Failed to load purchase_order_products.");
    const j = await res.json().catch(() => ({}));
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchPOProductsByPOId(poId: number) {
    const qs = [
        "limit=-1",
        "fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received",
        `filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}`,
    ].join("&");

    const res = await dFetch(`/items/${PO_PRODUCTS_COLLECTION}?${qs}`, {
        method: "GET",
    });
    if (!res.ok) throw new Error("Failed to load purchase_order_products for PO.");
    const j = await res.json().catch(() => ({}));
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchReceivingByPopIds(popIds: number[]) {
    if (!popIds.length) return [] as ReceivingRow[];

    const qs = [
        "limit=-1",
        "sort=-created_at",
        "fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at",
        `filter[purchase_order_product_id][_in]=${encodeURIComponent(popIds.join(","))}`,
    ].join("&");

    const res = await dFetch(`/items/${RECEIVING_ITEMS_COLLECTION}?${qs}`, {
        method: "GET",
    });

    if (!res.ok) return [] as ReceivingRow[];
    const j = await res.json().catch(() => ({}));
    return (j?.data ?? []) as ReceivingRow[];
}

async function isRfidExistsAnywhere(rfid: string) {
    const qs = [
        "limit=1",
        "fields=receiving_item_id",
        `filter[rfid_code][_eq]=${encodeURIComponent(rfid)}`,
    ].join("&");

    const res = await dFetch(`/items/${RECEIVING_ITEMS_COLLECTION}?${qs}`, {
        method: "GET",
    });

    if (!res.ok) return false;
    const j = await res.json().catch(() => ({}));
    return Array.isArray(j?.data) && j.data.length > 0;
}

async function fetchProducts(productIds: number[]) {
    if (!productIds.length) return new Map<number, ProductRow>();

    for (const col of PRODUCT_COLLECTIONS) {
        const qs = [
            "limit=-1",
            `fields=${encodeURIComponent(
                [
                    PRODUCT_PK_FIELD,
                    "id",
                    "barcode",
                    "product_code",
                    "sku",
                    "name",
                    "product_name",
                ].join(",")
            )}`,
            `filter[${encodeURIComponent(PRODUCT_PK_FIELD)}][_in]=${encodeURIComponent(
                productIds.join(",")
            )}`,
        ].join("&");

        const res = await dFetch(`/items/${col}?${qs}`, { method: "GET" });
        if (!res.ok) continue;

        const j = await res.json().catch(() => ({}));
        const rows: any[] = j?.data ?? [];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const map = new Map<number, ProductRow>();
        for (const r of rows) {
            const pid = toNum(r?.[PRODUCT_PK_FIELD] ?? r?.product_id ?? r?.id);
            if (!pid) continue;
            map.set(pid, r);
        }
        return map;
    }

    return new Map<number, ProductRow>();
}

// =====================
// DETAIL BUILDER
// =====================
async function buildDetail(poId: number): Promise<TaggingPODetail> {
    const headerRes = await dFetch(
        `/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=${encodeURIComponent(
            "purchase_order_id,purchase_order_no,supplier_name.supplier_name,supplier_name.name"
        )}`,
        { method: "GET" }
    );

    if (!headerRes.ok) throw new Error("PO not found.");
    const headerJson = await headerRes.json().catch(() => ({}));
    const header = headerJson?.data ?? null;

    const poNumber = toStr(header?.purchase_order_no, String(poId));
    const supplierName =
        toStr(header?.supplier_name?.supplier_name) ||
        toStr(header?.supplier_name?.name) ||
        "—";

    const poProducts = await fetchPOProductsByPOId(poId);
    const popIds = poProducts.map((x) => x.purchase_order_product_id);
    const productIds = Array.from(new Set(poProducts.map((x) => x.product_id)));

    const productsMap = await fetchProducts(productIds);
    const receiving = await fetchReceivingByPopIds(popIds);

    const taggedByPopId = new Map<number, number>();
    for (const r of receiving) {
        const popId = toNum(r?.purchase_order_product_id);
        if (!popId) continue;
        taggedByPopId.set(popId, (taggedByPopId.get(popId) ?? 0) + 1);
    }

    const items: TaggingPOItem[] = poProducts.map((line) => {
        const p = productsMap.get(line.product_id) || {};
        const scan = productPrimaryScanCode(p) || String(line.product_id);
        return {
            id: String(line.purchase_order_product_id),
            sku: scan, // UI still calls it SKU, but we accept barcode/product_code
            name: productName(p),
            expectedQty: Math.max(0, toNum(line.ordered_quantity)),
            taggedQty: taggedByPopId.get(line.purchase_order_product_id) ?? 0,
        };
    });

    const activity: TaggingActivity[] = receiving.map((r) => {
        const pid = toNum(r.product_id);
        const p = productsMap.get(pid) || {};
        return {
            id: String(r.receiving_item_id),
            sku: productPrimaryScanCode(p) || String(pid),
            productName: productName(p),
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

async function updatePOStatus(poId: number, detail: TaggingPODetail) {
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

    await dFetch(`/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }).catch(() => {});
}

async function patchReceivedQty(popId: number, receivedQty: number) {
    // Optional but helpful for downstream modules
    await dFetch(`/items/${PO_PRODUCTS_COLLECTION}/${encodeURIComponent(String(popId))}`, {
        method: "PATCH",
        body: JSON.stringify({ received: receivedQty }),
    }).catch(() => {});
}

// =====================
// HANDLERS
// =====================
export async function GET() {
    try {
        if (!DIRECTUS_ENABLED) return ok([] as TaggablePOListItem[]);

        const rows = await fetchApprovedPOs();
        const poIds = rows.map((r) => toNum(r?.purchase_order_id)).filter(Boolean);

        const poProducts = await fetchPOProductsByPOIds(poIds);

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

        const receiving = await fetchReceivingByPopIds(allPopIds);

        const taggedByPo = new Map<number, number>();
        for (const r of receiving) {
            const popId = toNum(r.purchase_order_product_id);
            const poId = popIdToPoId.get(popId);
            if (!poId) continue;
            taggedByPo.set(poId, (taggedByPo.get(poId) ?? 0) + 1);
        }

        const list: TaggablePOListItem[] = rows.map((r) => {
            const poId = toNum(r?.purchase_order_id);
            const totalItems = expectedByPo.get(poId) ?? 0;
            const taggedItems = taggedByPo.get(poId) ?? 0;

            const supplierName =
                toStr(r?.supplier_name?.supplier_name) ||
                toStr(r?.supplier_name?.name) ||
                "—";

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
        if (!DIRECTUS_ENABLED) {
            return bad("Directus config missing (DIRECTUS_URL / DIRECTUS_TOKEN).", 500);
        }

        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        if (action === "detail") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const detail = await buildDetail(poId);
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
            const exists = await isRfidExistsAnywhere(rfid);
            if (exists) return bad("RFID already exists in receiving items.", 400);

            const current = await buildDetail(poId);

            // ✅ strict match: SKU can be barcode or product_code (because detail.sku is primary scan code)
            const match = current.items.find(
                (x) => x.sku.toLowerCase() === sku.toLowerCase()
            );

            if (strict && !match) return bad(`Invalid SKU '${sku}' for this PO.`, 400);
            if (!match) return bad(`SKU '${sku}' not found in this PO.`, 400);

            if ((match.taggedQty ?? 0) + 1 > (match.expectedQty ?? 0)) {
                return bad("Tagging exceeds expected quantity for this SKU.", 400);
            }

            // Resolve POP + product_id using PO products + product table
            const poProducts = await fetchPOProductsByPOId(poId);
            const productIds = Array.from(new Set(poProducts.map((x) => x.product_id)));
            const productsMap = await fetchProducts(productIds);

            const line = poProducts.find((ln) => {
                const p = productsMap.get(ln.product_id) || {};
                const codes = productScanCodes(p);
                return codes.some((c) => c.toLowerCase() === sku.toLowerCase());
            });

            if (!line) return bad("Unable to resolve purchase_order_product_id for this scanned SKU.", 400);

            // Insert into purchase_order_receiving_items
            const insertRes = await dFetch(`/items/${RECEIVING_ITEMS_COLLECTION}`, {
                method: "POST",
                body: JSON.stringify({
                    purchase_order_product_id: toNum(line.purchase_order_product_id),
                    product_id: toNum(line.product_id),
                    rfid_code: rfid,
                }),
            });

            const insertJson = await insertRes.json().catch(() => ({}));
            if (!insertRes.ok) {
                const msg =
                    insertJson?.errors?.[0]?.message ||
                    insertJson?.error ||
                    "Failed to store RFID tag.";
                return bad(msg, 400);
            }

            // Rebuild detail (for updated counts + activity)
            const updated = await buildDetail(poId);

            // Patch received qty on purchase_order_products (optional, but useful)
            const updatedLine = updated.items.find((x) => x.id === String(line.purchase_order_product_id));
            if (updatedLine) {
                await patchReceivedQty(toNum(line.purchase_order_product_id), toNum(updatedLine.taggedQty));
            }

            // Update PO partial/received state
            await updatePOStatus(poId, updated);

            return ok(updated);
        }

        return bad("Invalid action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Request failed"), 400);
    }
}
