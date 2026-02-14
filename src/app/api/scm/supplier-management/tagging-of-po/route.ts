// src/app/api/scm/supplier-management/tagging-of-po/route.ts
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
// DIRECTUS CONFIG (.env.local dependent)
// =====================
function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "";

    const cleaned = String(raw || "").trim().replace(/\/$/, "");
    if (!cleaned) return "http://100.110.197.61:8056"; // last-resort fallback
    if (!/^https?:\/\//i.test(cleaned)) return `http://${cleaned}`;
    return cleaned;
}

function getServerToken() {
    return String(
        process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || ""
    ).trim();
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

const DEBUG = process.env.DEBUG_TAGGING_PO === "1";
function dlog(...args: any[]) {
    if (DEBUG) console.log("[tagging-of-po]", ...args);
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
        const msg =
            j?.errors?.[0]?.message || j?.error || `Upstream failed: ${r.status}`;
        throw new Error(msg);
    }
    return j;
}

// =====================
// CONSTS / COLLECTIONS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";

// IMPORTANT: based on your SQL FK
const PO_RECEIVING_COLLECTION = "purchase_order_receiving";
const RECEIVING_ITEMS_COLLECTION = "purchase_order_receiving_items";

const PO_STATUS_PARTIAL = Number(process.env.PO_STATUS_PARTIAL ?? 2);
const PO_STATUS_RECEIVED = Number(process.env.PO_STATUS_RECEIVED ?? 3);

// =====================
// HELPERS
// =====================
function ok(data: any, status = 200) {
    return NextResponse.json({ data }, { status });
}
function bad(error: string, status = 400, extra?: any) {
    return NextResponse.json(DEBUG ? { error, debug: extra } : { error }, { status });
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

// product helpers (scanner priority)
function productName(p: any) {
    return toStr(p?.product_name) || toStr(p?.name) || "Unknown";
}
function productPrimaryScan(p: any) {
    // scanner usually uses barcode; fallback product_code; else blank
    return toStr(p?.barcode) || toStr(p?.product_code) || "";
}
function productCodes(p: any) {
    const a = toStr(p?.barcode);
    const b = toStr(p?.product_code);
    const c = toStr(p?.sku);
    return [a, b, c].filter(Boolean);
}

function keyProdBranch(productId: number, branchId: number) {
    return `${productId}::${branchId}`;
}

// =====================
// MAP FETCHERS (permission-safe)
// =====================
async function fetchSuppliersMapByIds(base: string, supplierIds: number[]) {
    const map = new Map<number, any>();
    const uniq = Array.from(new Set((supplierIds || []).filter(Boolean)));
    if (!uniq.length) return map;

    // ✅ field-safe: no ap_balance, no name
    const url =
        `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
        `&filter[id][_in]=${encodeURIComponent(uniq.join(","))}` +
        `&fields=id,supplier_name`;

    const j = await fetchJson(url);
    for (const s of j?.data ?? []) {
        const id = Number(s?.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        map.set(id, { id, supplier_name: toStr(s?.supplier_name, "—") });
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
    unit_price?: string | number | null;
    received?: number | null;
    branch_id?: number | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id,unit_price`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id,unit_price`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

type PORow = {
    purchase_order_product_id: number; // PK (AUTO_INCREMENT)
    purchase_order_id: number;
    product_id: number;
    branch_id: number;
    isPosted: number;
    receipt_no?: string | null;
    received_quantity?: number;
};

async function fetchOpenPORowsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PORow[];
    const url =
        `${base}/items/${PO_RECEIVING_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}` +
        `&filter[isPosted][_eq]=0` +
        `&filter[receipt_no][_null]=true` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,isPosted,receipt_no,received_quantity`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PORow[];
}

async function fetchOpenPORowsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_RECEIVING_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&filter[isPosted][_eq]=0` +
        `&filter[receipt_no][_null]=true` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,isPosted,receipt_no,received_quantity`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PORow[];
}

type ReceivingItemRow = {
    receiving_item_id: number;
    purchase_order_product_id: number; // FK -> purchase_order_receiving.purchase_order_product_id
    product_id: number;
    rfid_code: string;
    created_at: string;
};

async function fetchReceivingItemsByPORIds(base: string, porIds: number[]) {
    if (!porIds.length) return [] as ReceivingItemRow[];
    const url =
        `${base}/items/${RECEIVING_ITEMS_COLLECTION}?limit=-1` +
        `&sort=-created_at` +
        `&filter[purchase_order_product_id][_in]=${encodeURIComponent(porIds.join(","))}` +
        `&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as ReceivingItemRow[];
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
// CORE: ensure/create purchase_order_receiving row
// =====================
async function ensureOpenReceivingRow(args: {
    base: string;
    poId: number;
    productId: number;
    branchId: number;
    unitPrice: number;
}) {
    const { base, poId, productId, branchId } = args;

    // try find existing OPEN row (isPosted=0, receipt_no NULL)
    const findUrl =
        `${base}/items/${PO_RECEIVING_COLLECTION}?limit=1` +
        `&sort=-purchase_order_product_id` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&filter[product_id][_eq]=${encodeURIComponent(String(productId))}` +
        `&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}` +
        `&filter[isPosted][_eq]=0` +
        `&filter[receipt_no][_null]=true` +
        `&fields=purchase_order_product_id,received_quantity`;

    const found = await fetchJson(findUrl);
    const row = Array.isArray(found?.data) ? found.data[0] : null;
    if (row?.purchase_order_product_id) {
        return {
            porId: toNum(row.purchase_order_product_id),
            receivedQty: toNum(row.received_quantity),
            created: false,
        };
    }

    // create new row (required NOT NULL fields per SQL)
    const insertUrl = `${base}/items/${PO_RECEIVING_COLLECTION}`;
    const payload = {
        purchase_order_id: poId,
        product_id: productId,

        // required columns
        branch_id: branchId,
        received_quantity: 0,
        unit_price: args.unitPrice || 0,
        discounted_amount: 0,
        vat_amount: 0,
        withholding_amount: 0,
        total_amount: 0,
        isPosted: 0,

        // optional columns ok to omit: receipt_no, receipt_date, received_date, lot_no, expiry_date, discount_type
    };

    dlog("Creating purchase_order_receiving row:", payload);

    const created = await fetchJson(insertUrl, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    const porId = toNum(created?.data?.purchase_order_product_id);
    if (!porId) {
        throw new Error(
            "Failed to create purchase_order_receiving row (missing purchase_order_product_id in response)."
        );
    }

    return { porId, receivedQty: 0, created: true };
}

async function patchPORReceivedQty(base: string, porId: number, receivedQty: number) {
    const url = `${base}/items/${PO_RECEIVING_COLLECTION}/${encodeURIComponent(String(porId))}`;
    await fetchJson(url, {
        method: "PATCH",
        body: JSON.stringify({ received_quantity: Math.max(0, Math.floor(receivedQty)) }),
    }).catch(() => {});
}

async function patchPOProductsReceivedQty(base: string, popId: number, receivedQty: number) {
    // optional but useful for downstream
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}/${encodeURIComponent(String(popId))}`;
    await fetchJson(url, {
        method: "PATCH",
        body: JSON.stringify({ received: Math.max(0, Math.floor(receivedQty)) }),
    }).catch(() => {});
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

// =====================
// DETAIL BUILDER (reads PO + PO_PRODUCTS + OPEN PO_RECEIVING + RECEIVING_ITEMS)
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
    const supplierName = supplierId
        ? toStr(suppliersMap.get(supplierId)?.supplier_name, "—")
        : "—";

    const poProducts = await fetchPOProductsByPOId(base, poId);

    const productIds = Array.from(
        new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean))
    );
    const productsMap = await fetchProductsMapByIds(base, productIds);

    // open receiving rows (isPosted=0, receipt_no null)
    const openPORows = await fetchOpenPORowsByPOId(base, poId);

    // map (product_id, branch_id) -> porId
    const porByKey = new Map<string, number>();
    const porIds: number[] = [];
    for (const r of openPORows) {
        const porId = toNum(r.purchase_order_product_id);
        const pid = toNum(r.product_id);
        const bid = toNum(r.branch_id);
        if (!porId || !pid || !bid) continue;
        const k = keyProdBranch(pid, bid);
        if (!porByKey.has(k)) {
            porByKey.set(k, porId);
            porIds.push(porId);
        }
    }

    const receivingItems = await fetchReceivingItemsByPORIds(base, porIds);

    // count tags per porId
    const taggedByPorId = new Map<number, number>();
    for (const it of receivingItems) {
        const porId = toNum(it.purchase_order_product_id);
        if (!porId) continue;
        taggedByPorId.set(porId, (taggedByPorId.get(porId) ?? 0) + 1);
    }

    // build items based on purchase_order_products (expected), counts based on receiving_items (tagged)
    const items: TaggingPOItem[] = poProducts.map((line) => {
        const pid = toNum(line.product_id);
        const bid = toNum(line.branch_id);
        const p = pid ? productsMap.get(pid) : null;

        const scan = p ? productPrimaryScan(p) : "";
        const sku = scan || toStr(p?.product_code) || String(pid || line.product_id);

        const porId = pid && bid ? porByKey.get(keyProdBranch(pid, bid)) : undefined;
        const taggedQty = porId ? taggedByPorId.get(porId) ?? 0 : 0;

        return {
            // keep the SAME item.id strategy as before (POP id) so UI flow doesn't change
            id: String(line.purchase_order_product_id),
            sku,
            name: p ? productName(p) : `Product #${pid || line.product_id}`,
            expectedQty: Math.max(0, toNum(line.ordered_quantity)),
            taggedQty,
        };
    });

    const activity: TaggingActivity[] = receivingItems.map((r) => {
        const pid = toNum(r.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const scan = p ? productPrimaryScan(p) : "";
        const sku = scan || toStr(p?.product_code) || String(pid);

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

// =====================
// RESOLVE scanned SKU to purchase_order_products line
// =====================
function resolvePoProductLine(args: {
    sku: string;
    strict: boolean;
    poProducts: PoProductRow[];
    productsMap: Map<number, any>;
}) {
    const scanned = toStr(args.sku).trim().toLowerCase();
    if (!scanned) return null;

    for (const ln of args.poProducts) {
        const pid = toNum(ln.product_id);
        const p = pid ? args.productsMap.get(pid) : null;

        const codes = p ? productCodes(p).map((c) => c.toLowerCase()) : [];
        const hasCodes = codes.length > 0;

        // ✅ strict: match real scan codes when present
        if (hasCodes) {
            if (codes.some((c) => c === scanned)) return ln;
            continue;
        }

        // ✅ if no barcode/product_code exists, allow product_id scan even if strict=true
        if (String(pid).toLowerCase() === scanned) return ln;
    }

    // non-strict fallback: allow product_id match even if codes exist
    if (!args.strict) {
        for (const ln of args.poProducts) {
            const pid = toNum(ln.product_id);
            if (String(pid).toLowerCase() === scanned) return ln;
        }
    }

    return null;
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

        // expected totals by PO
        const expectedByPo = new Map<number, number>();
        for (const line of poProducts) {
            const poId = toNum(line.purchase_order_id);
            if (!poId) continue;
            expectedByPo.set(
                poId,
                (expectedByPo.get(poId) ?? 0) + Math.max(0, toNum(line.ordered_quantity))
            );
        }

        // tagged totals: count receiving_items under OPEN purchase_order_receiving rows
        const openPORows = await fetchOpenPORowsByPOIds(base, poIds);
        const porIdToPoId = new Map<number, number>();
        const porIds: number[] = [];

        for (const r of openPORows) {
            const porId = toNum(r.purchase_order_product_id);
            const poId = toNum(r.purchase_order_id);
            if (!porId || !poId) continue;
            porIdToPoId.set(porId, poId);
            porIds.push(porId);
        }

        const receivingItems = await fetchReceivingItemsByPORIds(base, porIds);

        const taggedByPo = new Map<number, number>();
        for (const it of receivingItems) {
            const porId = toNum(it.purchase_order_product_id);
            const poId = porIdToPoId.get(porId);
            if (!poId) continue;
            taggedByPo.set(poId, (taggedByPo.get(poId) ?? 0) + 1);
        }

        // supplier names
        const supplierIds = rows.map((r: any) => toNum(r?.supplier_name)).filter(Boolean);
        const suppliersMap = await fetchSuppliersMapByIds(base, supplierIds);

        const list: TaggablePOListItem[] = rows.map((r: any) => {
            const poId = toNum(r?.purchase_order_id);
            const totalItems = expectedByPo.get(poId) ?? 0;
            const taggedItems = taggedByPo.get(poId) ?? 0;

            const sid = toNum(r?.supplier_name);
            const supplierName = sid
                ? toStr(suppliersMap.get(sid)?.supplier_name, "—")
                : "—";

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

            // global RFID uniqueness
            const exists = await isRfidExistsAnywhere(base, rfid);
            if (exists) return bad("RFID already exists in receiving items.", 400);

            // load PO lines + products for matching
            const poProducts = await fetchPOProductsByPOId(base, poId);
            const productIds = Array.from(
                new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean))
            );
            const productsMap = await fetchProductsMapByIds(base, productIds);

            const line = resolvePoProductLine({
                sku,
                strict,
                poProducts,
                productsMap,
            });

            if (strict && !line) {
                return bad(`Invalid SKU '${sku}' for this PO.`, 400, {
                    poId,
                    sku,
                    strict,
                    hint: "Strict requires barcode/product_code match (unless product has no codes, then product_id is allowed).",
                });
            }
            if (!line) return bad(`SKU '${sku}' not found in this PO.`, 400);

            const popId = toNum(line.purchase_order_product_id);
            const productId = toNum(line.product_id);
            const branchId = toNum(line.branch_id);
            const unitPrice = toNum(line.unit_price);

            if (!productId) return bad("Resolved line has missing product_id.", 400);
            if (!branchId) {
                return bad(
                    "Resolved line has missing branch_id. purchase_order_receiving.branch_id is NOT NULL; cannot create receiving row without it.",
                    400,
                    { poId, popId, productId, branchId }
                );
            }

            // do not exceed expected qty
            const currentDetail = await buildDetail(base, poId);
            const currentItem = currentDetail.items.find((x) => x.id === String(popId));
            const expectedQty = currentItem?.expectedQty ?? 0;
            const taggedQty = currentItem?.taggedQty ?? 0;

            if (taggedQty + 1 > expectedQty) {
                return bad("Tagging exceeds expected quantity for this SKU.", 400, {
                    expectedQty,
                    taggedQty,
                });
            }

            // ✅ Ensure OPEN purchase_order_receiving row exists (THIS FIXES FK)
            const ensured = await ensureOpenReceivingRow({
                base,
                poId,
                productId,
                branchId,
                unitPrice,
            });

            const porId = ensured.porId;

            // insert into purchase_order_receiving_items (FK -> purchase_order_receiving.purchase_order_product_id)
            const insertUrl = `${base}/items/${RECEIVING_ITEMS_COLLECTION}`;
            const insertPayload = {
                purchase_order_product_id: porId, // ✅ correct FK target
                product_id: productId,
                rfid_code: rfid,
            };

            dlog("Insert receiving_item:", insertPayload);

            await fetchJson(insertUrl, {
                method: "POST",
                body: JSON.stringify(insertPayload),
            });

            // rebuild detail for updated counts
            const updated = await buildDetail(base, poId);

            // update received qty fields for downstream
            const updatedItem = updated.items.find((x) => x.id === String(popId));
            const newTagged = toNum(updatedItem?.taggedQty);

            await patchPORReceivedQty(base, porId, newTagged);
            await patchPOProductsReceivedQty(base, popId, newTagged);

            // update PO status (kept)
            await updatePOStatus(base, poId, updated);

            return ok(updated);
        }

        return bad("Invalid action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Request failed"), 400);
    }
}
