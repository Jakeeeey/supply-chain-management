// src/app/api/scm/supplier-management/tagging-of-po/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusFetch } from "@/modules/supply-chain-management/supplier-management/utils/directus";

import type {
    TaggablePOListItem,
    TaggingPODetail,
    TaggingPOItem,
    TaggingActivity,
} from "@/modules/supply-chain-management/supplier-management/tagging-of-po/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEBUG = false; // ✅ Back to false for production
function dlog(...args: any[]) {
    if (DEBUG) console.log("[tagging-of-po]", ...args);
}

async function fetchJson(url: string, init?: RequestInit) {
    return directusFetch(url, {
        ...init,
        cache: "no-store", // ✅ Ensure fresh data for tagging counts
    });
}

// =====================
// CONSTS / COLLECTIONS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";

const PO_RECEIVING_COLLECTION = "purchase_order_receiving";
const RECEIVING_ITEMS_COLLECTION = "purchase_order_receiving_items";

// ✅ RFID rules: exactly 24 hex chars
const RFID_LEN = 24;

// =====================
// HELPERS
// =====================
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data }, { status });
}
function bad(error: string, status = 400, extra?: unknown) {
    return NextResponse.json(DEBUG ? { error, debug: extra } : { error }, { status });
}
function toStr(v: unknown, fb = "") {
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: any) {
    if (v && typeof v === "object" && "id" in v) return toNum(v.id);
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function nowISO() {
    return new Date().toISOString();
}
function timeDisplay(iso: string) {
    if (!iso) return "—";
    
    // Directus usually returns UTC time (sometimes without the 'Z' suffix).
    // Ensure the string is treated as UTC if it doesn't specify a timezone.
    const dateStr = iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`;
    const d = new Date(dateStr);
    
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function isDuplicateRfidMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    return (
        m.includes("cannot be duplicate") ||
        (m.includes("rfid") && (m.includes("already") || m.includes("exists"))) ||
        m.includes("already exists") ||
        m.includes("has to be unique") ||
        m.includes("unique") ||
        m.includes("duplicate") ||
        m.includes("conflict")
    );
}

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// ✅ normalize RFID: extract FIRST 24-hex EPC only
function normalizeRfidServer(raw: string): { rfid: string; hadMultiple: boolean } {
    const up = toStr(raw).toUpperCase();

    const matches = up.match(/[0-9A-F]{24,}/g) ?? [];
    if (matches.length > 0) {
        const first = (matches[0] ?? "").slice(0, RFID_LEN);
        return { rfid: first, hadMultiple: matches.length > 1 };
    }

    const cleaned = up.replace(/[^0-9A-F]/g, "");
    const sliced = cleaned.slice(0, RFID_LEN);
    return { rfid: sliced, hadMultiple: cleaned.length > RFID_LEN };
}

function productName(p: unknown) {
    const product = p as Record<string, unknown> | null;
    return toStr(product?.product_name) || toStr(product?.name) || "Unknown";
}
function productPrimaryScan(p: unknown) {
    const product = p as Record<string, unknown> | null;
    return toStr(product?.barcode) || toStr(product?.product_code) || "";
}
function productCodes(p: unknown) {
    const product = p as Record<string, unknown> | null;
    const a = toStr(product?.barcode);
    const b = toStr(product?.product_code);
    const c = toStr(product?.sku);
    return [a, b, c].filter(Boolean);
}

function keyProdBranch(productId: number, branchId: number) {
    return `${productId}::${branchId}`;
}

// =====================
// MAP FETCHERS
// =====================
async function fetchSuppliersMapByIds(base: string, supplierIds: number[]) {
    const map = new Map<number, { id: number; supplier_name: string }>();
    const uniq = Array.from(new Set((supplierIds || []).filter(Boolean)));
    if (!uniq.length) return map;

    const url =
        `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
        `&filter[id][_in]=${encodeURIComponent(uniq.join(","))}` +
        `&fields=id,supplier_name`;

    const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
    for (const s of j?.data ?? []) {
        const id = Number(s?.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        map.set(id, { id, supplier_name: toStr(s?.supplier_name, "—") });
    }
    return map;
}

async function fetchProductsMapByIds(base: string, productIds: number[]) {
    const map = new Map<number, { product_id: number; product_name: string; barcode: string; product_code: string }>();
    const uniq = Array.from(new Set((productIds || []).filter(Boolean)));
    if (!uniq.length) return map;

    const url =
        `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(uniq.join(","))}` +
        `&fields=product_id,product_name,barcode,product_code`;

    const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
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
    const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
    return Array.isArray(j?.data) ? j.data : [];
}

type PoProductRow = {
    purchase_order_product_id: number; // POP id
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    unit_price?: string | number | null;
    received?: number | null;
    branch_id?: number | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const rows: PoProductRow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id,unit_price`;
        const j = await fetchJson<{ data: PoProductRow[] }>(url);
        rows.push(...((j?.data ?? []) as PoProductRow[]));
    }
    return rows;
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,received,branch_id,unit_price`;

    const j = await fetchJson<{ data: PoProductRow[] }>(url);
    return (j?.data ?? []) as PoProductRow[];
}

type PORow = {
    purchase_order_product_id: number; // POR id (PK)
    purchase_order_id: number;
    product_id: number;
    branch_id: number;
    isPosted: number;
    receipt_no?: string | null;
    received_quantity?: number;
};

async function fetchAllPORowsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PORow[];
    const rows: PORow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_RECEIVING_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,isPosted,receipt_no,received_quantity`;
        const j = await fetchJson<{ data: PORow[] }>(url);
        rows.push(...((j?.data ?? []) as PORow[]));
    }
    return rows;
}

async function fetchAllPORowsByPOId(base: string, poId: number) {
    // Try both _eq and _in for maximum compatibility with different Directus versions/configurations
    const url =
        `${base}/items/${PO_RECEIVING_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,isPosted,receipt_no,received_quantity`;

    const j = await fetchJson(url);
    if (DEBUG) dlog(`fetchAllPORowsByPOId for PO ${poId} returned ${j?.data?.length ?? 0} rows.`);
    return (j?.data ?? []) as PORow[];
}

type ReceivingItemRow = {
    receiving_item_id: number;
    purchase_order_product_id: number; // can be POR id OR POP id (legacy)
    product_id: number;
    rfid_code: string;
    created_at: string;
};

async function fetchReceivingItemsByLinkIds(base: string, linkIds: number[]) {
    if (!linkIds.length) return [] as ReceivingItemRow[];

    const out: ReceivingItemRow[] = [];
    for (const ids of chunk(Array.from(new Set(linkIds)).filter(Boolean), 250)) {
        const url =
            `${base}/items/${RECEIVING_ITEMS_COLLECTION}?limit=-1` +
            `&sort=-created_at` +
            `&filter[purchase_order_product_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at`;
        const j = await fetchJson<{ data: ReceivingItemRow[] }>(url);
        out.push(...((j?.data ?? []) as ReceivingItemRow[]));
    }
    return out;
}

async function fetchExistingRfidRow(base: string, rfid: string): Promise<ReceivingItemRow | null> {
    const url =
        `${base}/items/${RECEIVING_ITEMS_COLLECTION}?limit=1` +
        `&sort=-created_at` +
        `&filter[rfid_code][_eq]=${encodeURIComponent(rfid)}` +
        `&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at`;

    const j = await fetchJson<{ data: ReceivingItemRow[] }>(url);
    const row = Array.isArray(j?.data) ? j.data[0] : null;
    return row ?? null;
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

    const findUrl =
        `${base}/items/${PO_RECEIVING_COLLECTION}?limit=1` +
        `&sort=-purchase_order_product_id` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&filter[product_id][_eq]=${encodeURIComponent(String(productId))}` +
        `&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}` +
        `&filter[isPosted][_eq]=0` +
        `&fields=purchase_order_product_id,received_quantity,receipt_no`;

    const found = await fetchJson<{ data: Record<string, unknown>[] }>(findUrl);
    const row = Array.isArray(found?.data) ? found.data[0] : null;
    if (row?.purchase_order_product_id) {
        return {
            porId: toNum(row.purchase_order_product_id),
            receivedQty: toNum(row.received_quantity),
            created: false,
        };
    }

    const insertUrl = `${base}/items/${PO_RECEIVING_COLLECTION}`;
    const payload: Record<string, unknown> = {
        purchase_order_id: poId,
        product_id: productId,
        branch_id: branchId,

        // ✅ Tagging should not mark as received
        received_quantity: 0,

        unit_price: args.unitPrice || 0,
        discounted_amount: 0,
        vat_amount: 0,
        withholding_amount: 0,
        total_amount: 0,
        isPosted: 0,

        // ✅ force null to avoid "" default
        receipt_no: null,
        receipt_date: null,
        received_date: null,
    };

    dlog("Creating purchase_order_receiving row:", payload);

    const created = await fetchJson<{ data: Record<string, unknown> }>(insertUrl, {
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

// =====================
// DETAIL BUILDER (POR+POP compatibility)
// =====================
async function buildDetail(base: string, poId: number): Promise<TaggingPODetail> {
    const headerUrl =
        `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
        `?fields=purchase_order_id,purchase_order_no,supplier_name`;

    const headerJ = await fetchJson<{ data: Record<string, unknown> }>(headerUrl);
    const header = headerJ?.data ?? null;

    const poNumber = toStr(header?.purchase_order_no, String(poId));

    const supplierId = toNum(header?.supplier_name);
    const suppliersMap = await fetchSuppliersMapByIds(base, supplierId ? [supplierId] : []);
    const supplierName = supplierId ? toStr(suppliersMap.get(supplierId)?.supplier_name, "—") : "—";

    const poProducts = await fetchPOProductsByPOId(base, poId);

    const productIds = Array.from(new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean)));
    const productsMap = await fetchProductsMapByIds(base, productIds);

    // ✅ Fetch ALL POR rows (even posted) to ensure we count EVERYTHING tagged for this PO
    const allPorRows = await fetchAllPORowsByPOId(base, poId);
    dlog(`Fetched ${allPorRows.length} allPorRows for PO ${poId}`);
    if (allPorRows.length > 0) {
        dlog(`Sample allPorRows[0] keys:`, Object.keys(allPorRows[0]));
        dlog(`Sample allPorRows[0] data:`, allPorRows[0]);
    }

    // Build linkId -> product::branch map (POR + POP)
    const porIdToKey = new Map<number, string>();
    const porIds: number[] = [];
    for (const r of allPorRows) {
        const porId = toNum(r.purchase_order_product_id);
        const pid = toNum(r.product_id);
        const bid = toNum(r.branch_id);
        if (DEBUG) {
            dlog(`Mapping POR row: porId=${porId}, pid=${pid}, bid=${bid}`);
        }
        if (!porId || !pid) continue; // bid 0 is allowed
        porIdToKey.set(porId, keyProdBranch(pid, bid));
        porIds.push(porId);
    }

    const popIdToKey = new Map<number, string>();
    const popIds: number[] = [];
    for (const ln of poProducts) {
        const popId = toNum(ln.purchase_order_product_id);
        const pid = toNum(ln.product_id);
        const bid = toNum(ln.branch_id);
        if (!popId || !pid) continue; // bid 0 is allowed
        popIdToKey.set(popId, keyProdBranch(pid, bid));
        popIds.push(popId);
    }

    // ✅ Fetch receiving items by BOTH POR ids and POP ids (compat)
    const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIds, ...popIds]);
    dlog(`Fetched ${receivingItems.length} receivingItems for PO ${poId}`);
    if (receivingItems.length > 0) {
        dlog(`Sample receivingItems[0] linkId: ${receivingItems[0].purchase_order_product_id}`);
    }

    // Count tags per key (product::branch)
    const taggedByKey = new Map<string, number>();
    for (const it of receivingItems) {
        const linkId = toNum(it.purchase_order_product_id);
        const key = porIdToKey.get(linkId) || popIdToKey.get(linkId);
        if (!key) {
            if (DEBUG) console.log(`[tagging-of-po] linkId ${linkId} has no mapping key.`);
            continue;
        }
        taggedByKey.set(key, (taggedByKey.get(key) ?? 0) + 1);
    }

    if (DEBUG) {
        console.log(`[tagging-of-po] Aggregated taggedByKey:`, Object.fromEntries(taggedByKey));
        console.log(`[tagging-of-po] porIdToKey size: ${porIdToKey.size}, popIdToKey size: ${popIdToKey.size}`);
    }

    const poolUsedByKey = new Map<string, number>();

    const items: TaggingPOItem[] = poProducts.map((line) => {
        const pid = toNum(line.product_id);
        const bid = toNum(line.branch_id);
        const p = productsMap.get(pid);

        const scan = p ? productPrimaryScan(p) : "";
        const sku = scan || toStr(p?.product_code) || String(pid || line.product_id);

        const key = pid ? keyProdBranch(pid, bid) : "";
        const totalPool = key ? taggedByKey.get(key) ?? 0 : 0;
        const usedSoFar = poolUsedByKey.get(key) ?? 0;
        const expected = toNum(line.ordered_quantity);

        // ✅ Distribute tags: fill this line up to its expected quantity from the remaining pool
        const canTake = Math.max(0, expected);
        const remainingInPool = Math.max(0, totalPool - usedSoFar);
        const allocated = Math.min(canTake, remainingInPool);

        if (DEBUG) {
            dlog(`Line [${sku}]: key=${key}, totalPool=${totalPool}, usedSoFar=${usedSoFar}, allocated=${allocated}`);
        }

        poolUsedByKey.set(key, usedSoFar + allocated);

        return {
            id: String(line.purchase_order_product_id),
            sku,
            name: toStr(p?.product_name, "Unknown Product"),
            expectedQty: expected,
            taggedQty: allocated,
        };
    });

    const activity: TaggingActivity[] = activityFromReceivingItems(receivingItems, productsMap);

    return {
        id: String(poId),
        poNumber,
        supplierName,
        items,
        activity: activity.slice(0, 50),
    };
}

function activityFromReceivingItems(
    receivingItems: ReceivingItemRow[],
    productsMap: Map<number, { product_name: string; barcode: string; product_code: string }>
): TaggingActivity[] {
    return receivingItems.map((r) => {
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
        _rawTaggedByKey: taggedByKey, // Expose raw counts for SKU resolution
    } as any;
}

// =====================
// RESOLVE scanned SKU to purchase_order_products line
// =====================
function resolvePoProductLine(args: {
    sku: string;
    strict: boolean;
    poProducts: PoProductRow[];
    productsMap: Map<number, any>;
    taggedByKey: Map<string, number>; // ✅ Pass existing counts to prefer incomplete rows
}) {
    const scanned = toStr(args.sku).trim().toLowerCase();
    if (!scanned) return null;

    // 1. Try to find products by barcode or product_code
    const matchedPids = new Set<number>();
    for (const [pid, p] of args.productsMap.entries()) {
        const s = productPrimaryScan(p).toLowerCase();
        const c = toStr(p.product_code).toLowerCase();
        if (s === scanned || c === scanned) {
            matchedPids.add(pid);
        }
    }

    // Sort products: Incomplete items first (those where we haven't reached expected qty)
    const sortedLines = [...args.poProducts].sort((a, b) => {
        const keyA = keyProdBranch(toNum(a.product_id), toNum(a.branch_id));
        const keyB = keyProdBranch(toNum(b.product_id), toNum(b.branch_id));
        const isDoneA = (args.taggedByKey.get(keyA) ?? 0) >= toNum(a.ordered_quantity);
        const isDoneB = (args.taggedByKey.get(keyB) ?? 0) >= toNum(b.ordered_quantity);
        if (isDoneA && !isDoneB) return 1;
        if (!isDoneA && isDoneB) return -1;
        return 0;
    });

    for (const ln of sortedLines) {
        const pid = toNum(ln.product_id);
        const p = args.productsMap.get(pid);
        const skuFromProd = p ? productPrimaryScan(p).toLowerCase() : "";
        const codeFromProd = p ? toStr(p.product_code).toLowerCase() : "";

        if (skuFromProd === scanned || codeFromProd === scanned || String(pid) === scanned) {
            return ln;
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

        const rows = await fetchApprovedPOs(base) as Record<string, unknown>[];
        const poIds = rows.map((r) => toNum(r?.purchase_order_id)).filter(Boolean);

        const poProducts = await fetchPOProductsByPOIds(base, poIds);

        const expectedByPo = new Map<number, number>();
        for (const line of poProducts) {
            const poId = toNum(line.purchase_order_id);
            if (!poId) continue;
            expectedByPo.set(poId, (expectedByPo.get(poId) ?? 0) + Math.max(0, toNum(line.ordered_quantity)));
        }

        // POR rows (all) for comprehensive tag counting
        const porRows = await fetchAllPORowsByPOIds(base, poIds);
        const porIdToPoId = new Map<number, number>();
        const porIds: number[] = [];
        for (const r of porRows) {
            const porId = toNum(r.purchase_order_product_id);
            const poId = toNum(r.purchase_order_id);
            if (!porId || !poId) continue;
            porIdToPoId.set(porId, poId);
            porIds.push(porId);
        }

        // POP ids mapping (legacy)
        const popIdToPoId = new Map<number, number>();
        const popIds: number[] = [];
        for (const ln of poProducts) {
            const popId = toNum(ln.purchase_order_product_id);
            const poId = toNum(ln.purchase_order_id);
            if (!popId || !poId) continue;
            popIdToPoId.set(popId, poId);
            popIds.push(popId);
        }

        // ✅ Fetch receiving_items by BOTH POR ids and POP ids
        const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIds, ...popIds]);

        const taggedByPo = new Map<number, number>();
        for (const it of receivingItems) {
            const linkId = toNum(it.purchase_order_product_id);
            const poId = porIdToPoId.get(linkId) ?? popIdToPoId.get(linkId);
            if (!poId) continue;
            taggedByPo.set(poId, (taggedByPo.get(poId) ?? 0) + 1);
        }

        const supplierIds = rows.map((r) => toNum(r?.supplier_name)).filter(Boolean);
        const suppliersMap = await fetchSuppliersMapByIds(base, supplierIds);

        const list: TaggablePOListItem[] = rows.map((r) => {
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
    } catch (e: unknown) {
        const error = e as Error;
        return bad(String(error?.message ?? error ?? "Failed to load list"), 500);
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
            const rfidRaw = toStr(body?.rfid);
            const strict = Boolean(body?.strict);

            if (!poId) return bad("Missing poId.", 400);
            if (!sku) return bad("Missing sku/barcode/product_code.", 400);
            if (!rfidRaw) return bad("Missing rfid.", 400);

            const { rfid } = normalizeRfidServer(rfidRaw);

            if (!rfid || rfid.length !== RFID_LEN) {
                return bad(`Invalid RFID. RFID must be exactly ${RFID_LEN} hexadecimal characters.`, 400, {
                    rfidRaw,
                    normalized: rfid,
                });
            }

            const poProducts = await fetchPOProductsByPOId(base, poId);
            const productIds = Array.from(new Set(poProducts.map((x) => toNum(x.product_id)).filter(Boolean)));
            const productsMap = await fetchProductsMapByIds(base, productIds);

            // Resolve matching line (now considers existing counts to find incomplete lines)
            const detailWithRawTags = (await buildDetail(base, poId)) as any;
            const line = resolvePoProductLine({
                sku,
                strict,
                poProducts,
                productsMap,
                taggedByKey: detailWithRawTags._rawTaggedByKey, 
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

            // ✅ RFID duplicate detection
            const existing = await fetchExistingRfidRow(base, rfid);
            if (existing) {
                return bad(`RFID code '${rfid}' already exists in receiving items. Cannot be duplicate.`, 409, { rfid });
            }

            // do not exceed expected qty
            const currentDetail = await buildDetail(base, poId);
            const currentItem = currentDetail.items.find((x) => x.id === String(popId));
            const expectedQty = currentItem?.expectedQty ?? 0;
            const taggedQty = currentItem?.taggedQty ?? 0;

            if (taggedQty + 1 > expectedQty) {
                return bad("Tagging exceeds expected quantity for this SKU.", 400, { expectedQty, taggedQty });
            }

            // Ensure unposted purchase_order_receiving row exists (receipt fields forced to NULL)
            const ensured = await ensureOpenReceivingRow({ base, poId, productId, branchId, unitPrice });
            const porId = ensured.porId;

            // insert into purchase_order_receiving_items (✅ always POR id going forward)
            const insertUrl = `${base}/items/${RECEIVING_ITEMS_COLLECTION}`;
            const insertPayload = {
                purchase_order_product_id: porId,
                product_id: productId,
                rfid_code: rfid,
            };

            dlog("Insert receiving_item:", insertPayload);

            await fetchJson(insertUrl, {
                method: "POST",
                body: JSON.stringify(insertPayload),
            });

            // 2) OPTIMISTIC UPDATE:
            // Fetch the current state immediately. If Directus hasn't indexed the new row yet (common),
            // we will manually inject it into the result so the UI updates instantly.
            const updated = await buildDetail(base, poId);

            const isPresent = updated.activity.some((a) => a.rfid === rfid);
            if (!isPresent) {
                if (DEBUG) dlog(`Optimistically injecting tag ${rfid} for SKU ${sku}`);
                
                // Find the line that should receive this tag
                const line = updated.items.find((it) => it.sku === sku);
                if (line) {
                    // Only increment if not already "full" in the returned state
                    // (if it's already full, Directus might have actually returned it and it's just a duplicate activity check)
                    if (line.taggedQty < line.expectedQty) {
                        line.taggedQty++;
                    }
                    
                    // Add to activity log at the top
                    updated.activity.unshift({
                        id: `optimistic-${Date.now()}`,
                        sku,
                        productName: line.name,
                        rfid: rfid,
                        time: "Just Now",
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: "Item tagged successfully.",
                updatedDetail: updated,
            });
        }

        // -------------------------
        // send_partially_tagged
        // -------------------------
        if (action === "send_partially_tagged") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            // Update status to 12 (En Route / Transit)
            const patchUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
            await fetchJson(patchUrl, {
                method: "PATCH",
                body: JSON.stringify({ inventory_status: 12 }),
            });

            const updated = await buildDetail(base, poId);
            return ok(updated);
        }

        return bad(`Unknown action: ${action}`, 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Request failed"), 400);
    }
}
