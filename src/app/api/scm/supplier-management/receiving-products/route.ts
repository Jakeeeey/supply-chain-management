// src/app/api/scm/supplier-management/receiving-products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusFetch as fetchJson } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function pickNum(obj: any, keys: string[]) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) {
            const n = toNum(obj[k]);
            if (n !== 0) return n;
        }
    }
    return 0;
}
function pickStr(obj: any, keys: string[], fb = "") {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) {
            const s = String(obj[k]).trim();
            if (s) return s;
        }
    }
    return fb;
}

/**
 * Sequential: total = 1 - Π(1 - pi/100)
 */
function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();

    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;

    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);

    if (!nums.length) return 0;

    const netFactor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    const combined = (1 - netFactor) * 100;

    return Math.max(0, Math.min(100, Number(combined.toFixed(4))));
}
function nowISO() {
    return new Date().toISOString();
}
function ymdToIsoDate(ymd: string) {
    return toStr(ymd);
}
function keyLine(poId: number, productId: number, branchId: number) {
    return `${poId}::${productId}::${branchId}`;
}

// =====================
// COLLECTIONS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const BRANCHES_COLLECTION = "branches";

const POR_COLLECTION = "purchase_order_receiving";
const POR_ITEMS_COLLECTION = "purchase_order_receiving_items";

type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

type ListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    itemsCount: number;
    branchesCount: number;
};

type POItem = {
    id: string;
    porId: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;

    expectedQty: number; // ordered qty
    receivedQty: number;
    requiresRfid: true;

    taggedQty: number;
    rfids: string[];
    isReceived: boolean;
};

type PurchaseOrderDetail = {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string };
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    allocations: Array<{
        branch: { id: string; name: string };
        items: POItem[];
    }>;
    createdAt: string;
};

type PoProductRow = {
    purchase_order_product_id: number; // POP id
    purchase_order_id: number;
    product_id: number;
    branch_id?: number | null;
    ordered_quantity: number;
};

// =====================
// CHUNK
// =====================
function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// =====================
// FETCHERS
// =====================
const POR_SAFE_FIELDS =
    "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,lot_no,expiry_date";

async function fetchApprovedNotReceivedPOs(base: string) {
    const qs = [
        "limit=-1",
        "sort=-date_encoded",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,approver_id,date_approved,payment_status,inventory_status,date_received,supplier_name,total_amount",
        "filter[_or][0][date_approved][_nnull]=true",
        "filter[_or][1][approver_id][_nnull]=true",
        "filter[_or][2][payment_status][_eq]=2",
        "filter[date_received][_null]=true",
    ].join("&");

    const url = `${base}/items/${PO_COLLECTION}?${qs}`;
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchReceivingItemsByLinkIds(base: string, linkIds: number[]) {
    if (!linkIds.length) return [];
    const out: any[] = [];
    for (const ids of chunk(Array.from(new Set(linkIds)).filter(Boolean), 250)) {
        const qs: string[] = [
            "limit=-1",
            "sort=-created_at",
            "fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at",
            `filter[purchase_order_product_id][_in]=${encodeURIComponent(ids.join(","))}`,
        ];
        const url = `${base}/items/${POR_ITEMS_COLLECTION}?${qs.join("&")}`;
        const j = await fetchJson(url);
        out.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return out;
}

async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: any[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
}

async function fetchPORById(base: string, porId: number) {
    const url =
        `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(porId))}` +
        `?fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
    const j = await fetchJson(url);
    return j?.data ?? null;
}

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const rows: any[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson(url);
    return (Array.isArray(j?.data) ? j.data : []) as PoProductRow[];
}

async function fetchSinglePOLineByKey(base: string, poId: number, productId: number, branchId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&filter[product_id][_eq]=${encodeURIComponent(String(productId))}` +
        `&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity`;
    const j = await fetchJson(url);
    const row = Array.isArray(j?.data) ? j.data[0] : null;
    return row ?? null;
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

async function patchPO(base: string, poId: number, payload: any) {
    const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) }).catch(() => {});
}

// =====================
// BUILDERS / LOGIC
// =====================
function productDisplayCode(p: any, productId: number) {
    const pc = toStr(p?.product_code);
    const bc = toStr(p?.barcode);
    if (pc && bc && pc !== bc) return `${pc} (${bc})`;
    return pc || bc || String(productId);
}

// IMPORTANT: Only treat received_quantity as REAL when there is receipt evidence OR posted.
function hasReceiptEvidence(por: any) {
    return Boolean(toStr(por?.receipt_no) || toStr(por?.receipt_date) || toStr(por?.received_date));
}
function effectiveReceivedQty(por: any) {
    const posted = toNum(por?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(por?.received_quantity ?? 0));
    if (!hasReceiptEvidence(por)) return 0;
    return Math.max(0, toNum(por?.received_quantity ?? 0));
}

function buildPorIdsByKey(porRows: any[]) {
    const map = new Map<string, number[]>();
    for (const r of porRows) {
        const poId = toNum(r?.purchase_order_id);
        const pid = toNum(r?.product_id);
        const bid = toNum(r?.branch_id);
        const porId = toNum(r?.purchase_order_product_id);
        if (!poId || !pid || !bid || !porId) continue;
        const k = keyLine(poId, pid, bid);
        const arr = map.get(k) ?? [];
        arr.push(porId);
        map.set(k, arr);
    }
    return map;
}

function buildTagMapsForScopes(args: {
    poLines: PoProductRow[];
    porRows: any[];
    receivingItems: any[];
}) {
    const porIdToKey = new Map<number, string>();
    for (const r of args.porRows) {
        const porId = toNum(r?.purchase_order_product_id);
        const poId = toNum(r?.purchase_order_id);
        const pid = toNum(r?.product_id);
        const bid = toNum(r?.branch_id);
        if (!porId || !poId || !pid || !bid) continue;
        porIdToKey.set(porId, keyLine(poId, pid, bid));
    }

    const popIdToKey = new Map<number, string>();
    for (const ln of args.poLines) {
        const popId = toNum(ln?.purchase_order_product_id);
        const poId = toNum(ln?.purchase_order_id);
        const pid = toNum(ln?.product_id);
        const bid = toNum(ln?.branch_id);
        if (!popId || !poId || !pid || !bid) continue;
        popIdToKey.set(popId, keyLine(poId, pid, bid));
    }

    const rfidsByKey = new Map<string, string[]>();
    for (const it of args.receivingItems ?? []) {
        const linkId = toNum(it?.purchase_order_product_id);
        const key = porIdToKey.get(linkId) || popIdToKey.get(linkId);
        if (!key) continue;
        const code = toStr(it?.rfid_code);
        if (!code) continue;
        const arr = rfidsByKey.get(key) ?? [];
        arr.push(code);
        rfidsByKey.set(key, arr);
    }

    const taggedCountByKey = new Map<string, number>();
    for (const [k, arr] of rfidsByKey.entries()) taggedCountByKey.set(k, arr.length);

    return { taggedCountByKey, rfidsByKey };
}

function isTaggingComplete(poId: number, lines: PoProductRow[], taggedCountByKey: Map<string, number>) {
    if (!lines.length) return false;

    for (const ln of lines) {
        const pid = toNum(ln.product_id);
        const bid = toNum(ln.branch_id);
        const expected = Math.max(0, toNum(ln.ordered_quantity));
        if (!pid || !bid || expected <= 0) continue;

        const k = keyLine(poId, pid, bid);
        const tagged = taggedCountByKey.get(k) ?? 0;
        if (tagged < expected) return false;
    }
    return true;
}

function isFullyReceived(
    poId: number,
    lines: PoProductRow[],
    porRows: any[],
    taggedCountByKey: Map<string, number>
) {
    if (!lines.length) return false;

    const porIdsByKey = buildPorIdsByKey(porRows);

    const recByPor = new Map<number, number>();
    const postedAny = (porRows ?? []).some((r) => toNum(r?.isPosted) === 1);
    for (const r of porRows) {
        const porId = toNum(r?.purchase_order_product_id);
        if (!porId) continue;
        recByPor.set(porId, effectiveReceivedQty(r));
    }
    if (postedAny) return true;

    for (const ln of lines) {
        const pid = toNum(ln.product_id);
        const bid = toNum(ln.branch_id);
        const expected = Math.max(0, toNum(ln.ordered_quantity));
        if (!pid || !bid || expected <= 0) continue;

        const k = keyLine(poId, pid, bid);

        const tagged = taggedCountByKey.get(k) ?? 0;
        if (tagged < expected) return false;

        const porIds = porIdsByKey.get(k) ?? [];
        if (!porIds.length) return false;

        const receivedQty = porIds.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
        if (receivedQty < expected) return false;
    }

    return true;
}

function receivingStatusFrom(porRows: any[]): POStatus {
    const posted = (porRows ?? []).some((r) => toNum(r?.isPosted) === 1);
    if (posted) return "CLOSED";

    const anyActivity = (porRows ?? []).some((r) => {
        const rq = effectiveReceivedQty(r);
        return rq > 0 || hasReceiptEvidence(r);
    });

    return anyActivity ? "PARTIAL" : "OPEN";
}

// =====================
// ROUTES
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();

        // ✅ Only approved + not yet fully received at PO header level (fast scope)
        const poHeaders = await fetchApprovedNotReceivedPOs(base);
        const poIds = poHeaders.map((p: any) => toNum(p?.purchase_order_id)).filter(Boolean);
        if (!poIds.length) return ok([] as ListItem[]);

        const poLinesAll = await fetchPOProductsByPOIds(base, poIds);
        const porRowsAll = await fetchPORByPOIds(base, poIds);

        const porIds = porRowsAll.map((r: any) => toNum(r?.purchase_order_product_id)).filter(Boolean);
        const popIds = poLinesAll.map((l: any) => toNum(l?.purchase_order_product_id)).filter(Boolean);

        // ✅ RFID items might be linked to POR ids OR POP ids (legacy)
        const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIds, ...popIds]);

        const { taggedCountByKey } = buildTagMapsForScopes({ poLines: poLinesAll, porRows: porRowsAll, receivingItems });

        const porByPo = new Map<number, any[]>();
        for (const r of porRowsAll) {
            const poId = toNum(r?.purchase_order_id);
            if (!poId) continue;
            const arr = porByPo.get(poId) ?? [];
            arr.push(r);
            porByPo.set(poId, arr);
        }

        const linesByPo = new Map<number, PoProductRow[]>();
        for (const ln of poLinesAll) {
            const poId = toNum(ln?.purchase_order_id);
            if (!poId) continue;
            const arr = linesByPo.get(poId) ?? [];
            arr.push(ln);
            linesByPo.set(poId, arr);
        }

        const supplierIds = poHeaders.map((p: any) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierMap = await fetchSupplierNames(base, supplierIds);

        const list: ListItem[] = [];

        for (const po of poHeaders) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            // ✅ must be tagging-complete
            const taggingOk = isTaggingComplete(poId, lines, taggedCountByKey);
            if (!taggingOk) continue;

            // ✅ exclude posted (posting/archived na)
            const postedAny = porRows.some((r) => toNum(r?.isPosted) === 1);
            if (postedAny) continue;

            // ✅ exclude fully received (for posting page na)
            const fully = isFullyReceived(poId, lines, porRows, taggedCountByKey);
            if (fully) continue;

            const sid = toNum(po?.supplier_name);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";
            const poNumber = toStr(po?.purchase_order_no, String(poId));

            const products = new Set<number>();
            const branches = new Set<number>();
            for (const ln of lines) {
                const pid = toNum(ln?.product_id);
                const bid = toNum(ln?.branch_id);
                if (pid) products.add(pid);
                if (bid) branches.add(bid);
            }

            list.push({
                id: String(poId),
                poNumber,
                supplierName,
                status: receivingStatusFrom(porRows),
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                itemsCount: products.size,
                branchesCount: branches.size,
            });
        }

        list.sort((a, b) => (a.poNumber < b.poNumber ? 1 : -1));
        return ok(list);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed to load receiving list"), 500);
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        // -------------------------
        // Open PO
        // -------------------------
        if (action === "open_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            // ✅ Fetch header using wildcard fields to avoid "field not found" errors
            const poUrl =
                `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
                `?fields=*,discount_type.*`;
 
             const pj = await fetchJson(poUrl);
             const po: any = pj?.data ?? null;
            if (!po) return bad("PO not found.", 404);

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);

            const postedAny = porRows.some((r: any) => toNum(r?.isPosted) === 1);
            if (postedAny) return bad("PO is already posted. Proceed to Posting of PO.", 409);

            const porIds = porRows.map((r: any) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const popIds = lines.map((l: any) => toNum(l?.purchase_order_product_id)).filter(Boolean);

            const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIds, ...popIds]);
            const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });

            const ready = isTaggingComplete(poId, lines, taggedCountByKey);
            if (!ready) return bad("PO is not ready for receiving. Complete RFID tagging first.", 409);

            // We allow opening even if fully received, so that save_receipt can get the final state for printing.
            // scan_rfid already has checks to prevent double-receiving.
            const fully = isFullyReceived(poId, lines, porRows, taggedCountByKey);

            const sid = toNum(po?.supplier_name);
            const supplierMap = await fetchSupplierNames(base, sid ? [sid] : []);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";

            const productIds = Array.from(new Set(lines.map((x) => toNum(x.product_id)).filter(Boolean)));
            const branchIds = Array.from(new Set(lines.map((x) => toNum(x.branch_id)).filter(Boolean)));

            const productsMap = await fetchProductsMap(base, productIds);
            const branchesMap = await fetchBranchesMap(base, branchIds);

            const porIdsByKey = buildPorIdsByKey(porRows);

            const recByPor = new Map<number, number>();
            for (const r of porRows) {
                const porId = toNum(r?.purchase_order_product_id);
                if (!porId) continue;
                recByPor.set(porId, effectiveReceivedQty(r));
            }

            // ✅ Resolve discount from header (robust pick)
            let discountPercent = pickNum(po, ["discount_percent", "discountPercent", "discount_rate", "discount_percentage"]);
            
            // If header percent is zero, try to get from the discount_type relation (if populated)
            if (!discountPercent && po?.discount_type?.total_percent) {
                discountPercent = toNum(po.discount_type.total_percent);
            }

            const discountAmountHeader = pickNum(po, ["discounted_amount", "discount_amount", "discountAmount", "discount_value"]);
            const grossAmountHeader = pickNum(po, ["gross_amount", "grossAmount", "subtotal", "sub_total"]);

            if (!discountPercent && discountAmountHeader > 0 && grossAmountHeader > 0) {
                discountPercent = (discountAmountHeader / grossAmountHeader) * 100;
            }

            const discountTypeLabel =
                toStr(po?.discount_type?.discount_type) ||
                pickStr(po, ["discount_type", "discountType", "discount_code", "discountCode"]) ||
                (discountPercent > 0 ? `${discountPercent.toFixed(2)}% Off` : "No Discount");

            // ✅ Last resort: if label found but percent 0, try to derive from label
            if (discountPercent === 0 && discountTypeLabel && discountTypeLabel !== "No Discount") {
                discountPercent = deriveDiscountPercentFromCode(discountTypeLabel);
            }

            const itemsByBranch = new Map<number, POItem[]>();

            for (const ln of lines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id);
                const ordered = Math.max(0, toNum(ln.ordered_quantity));
                if (!pid || !bid || ordered <= 0) continue;

                const k = keyLine(poId, pid, bid);

                const porIdsForLine = porIdsByKey.get(k) ?? [];
                if (!porIdsForLine.length) continue;

                const p = productsMap.get(pid) ?? null;

                const rfids = rfidsByKey.get(k) ?? [];
                const taggedQty = rfids.length;

                const receivedQty = porIdsForLine.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
                const isReceived = receivedQty >= ordered;

                // Pick a stable POR id for UI (first is ok)
                const primaryPorId = porIdsForLine[0];

                const unitPrice = toNum((ln as any)?.unit_price);
                const unitDiscount = unitPrice * (discountPercent / 100);

                const item: any = {
                    id: String(primaryPorId),
                    porId: String(primaryPorId),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: "—",
                    expectedQty: ordered,
                    receivedQty,
                    requiresRfid: true,
                    taggedQty,
                    rfids,
                    isReceived,
                    unitPrice,
                    discountType: discountTypeLabel,
                    discountAmount: unitDiscount,
                    netAmount: receivedQty * (unitPrice - unitDiscount),
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

            const detail: PurchaseOrderDetail = {
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no, String(poId)),
                supplier: { id: String(sid || ""), name: supplierName },
                status: receivingStatusFrom(porRows),
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                allocations,
                createdAt: toStr(po?.date_encoded || po?.date || "", nowISO()),
            };

            return ok(detail);
        }

        // -------------------------
        // verify_po (compat)
        // -------------------------
        if (action === "verify_po") {
            const barcode = toStr(body?.barcode);
            if (!barcode) return bad("Missing barcode.", 400);

            const url =
                `${base}/items/${PO_COLLECTION}?limit=1` +
                `&filter[purchase_order_no][_eq]=${encodeURIComponent(barcode)}` +
                `&fields=purchase_order_id`;

            const j = await fetchJson(url);
            const row = Array.isArray(j?.data) ? j.data[0] : null;
            const poId = toNum(row?.purchase_order_id);
            if (!poId) return bad("PO not found.", 404);

            const poReq = { ...req, json: async () => ({ action: "open_po", poId }) } as any;
            return POST(poReq);
        }

        // -------------------------
        // scan_rfid (POR+POP compatibility)
        // -------------------------
        if (action === "scan_rfid") {
            const poId = toNum(body?.poId);
            const rfid = toStr(body?.rfid);
            if (!poId) return bad("Missing poId.", 400);
            if (!rfid) return bad("Missing rfid.", 400);

            const riUrl =
                `${base}/items/${POR_ITEMS_COLLECTION}?limit=1` +
                `&filter[rfid_code][_eq]=${encodeURIComponent(rfid)}` +
                `&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at`;

            const rij = await fetchJson(riUrl);
            const row = Array.isArray(rij?.data) ? rij.data[0] : null;
            if (!row) return bad("RFID not found. Tag this item first in Tagging of PO.", 404);

            const linkId = toNum(row?.purchase_order_product_id);
            if (!linkId) return bad("RFID record has no purchase_order_product_id.", 400);

            // 1) Try POR directly
            let por = null as any;
            try {
                por = await fetchPORById(base, linkId);
            } catch {}

            // 2) If legacy POP id, resolve to POR by key
            if (!por) {
                const popUrl =
                    `${base}/items/${PO_PRODUCTS_COLLECTION}/${encodeURIComponent(String(linkId))}` +
                    `?fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity`;
                const popJ = await fetchJson(popUrl);
                const pop = popJ?.data ?? null;

                const ownerPoId = toNum(pop?.purchase_order_id);
                const productId = toNum(pop?.product_id);
                const branchId = toNum(pop?.branch_id);
                if (!ownerPoId || !productId || !branchId) return bad("Unable to resolve PO owner of this RFID.", 400);
                if (ownerPoId !== poId) return bad("RFID belongs to a different PO.", 400);

                // Find matching POR row
                const findPorUrl =
                    `${base}/items/${POR_COLLECTION}?limit=1` +
                    `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(ownerPoId))}` +
                    `&filter[product_id][_eq]=${encodeURIComponent(String(productId))}` +
                    `&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}` +
                    `&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
                const findJ = await fetchJson(findPorUrl);
                por = Array.isArray(findJ?.data) ? findJ.data[0] : null;

                if (!por) return bad("POR row not found for this RFID. Please re-tag this PO line.", 409);
            }

            const ownerPoId = toNum(por?.purchase_order_id);
            if (!ownerPoId) return bad("Unable to resolve PO owner of this RFID.", 400);
            if (ownerPoId !== poId) return bad("RFID belongs to a different PO.", 400);

            const posted = toNum(por?.isPosted) === 1;
            const productId = toNum(por?.product_id ?? row?.product_id);
            const branchId = toNum(por?.branch_id);

            // expected qty + popId for this line
            const line = await fetchSinglePOLineByKey(base, poId, productId, branchId);
            const expectedQty = Math.max(0, toNum(line?.ordered_quantity));
            const popId = toNum(line?.purchase_order_product_id);

            // tagged qty for this line (POR+POP)
            const taggedRows = await fetchReceivingItemsByLinkIds(base, [toNum(por?.purchase_order_product_id), popId].filter(Boolean));
            const taggedQty = Array.isArray(taggedRows) ? taggedRows.length : 0;

            const receivedQty = effectiveReceivedQty(por);
            const alreadyReceived = posted || (expectedQty > 0 && receivedQty >= expectedQty);

            const pm = await fetchProductsMap(base, productId ? [productId] : []);
            const p = productId ? pm.get(productId) : null;

            return ok({
                porId: String(toNum(por?.purchase_order_product_id)),
                rfid: toStr(row?.rfid_code),
                productId: String(productId || ""),
                productName: toStr(p?.product_name, `Product #${productId}`),
                sku: productDisplayCode(p, productId),
                time: toStr(row?.created_at, ""),
                alreadyReceived,
                taggedQty,
                expectedQty,
            });
        }

        // -------------------------
        // save_receipt (incremental, POR+POP compatibility)
        // -------------------------
        if (action === "save_receipt") {
            const poId = toNum(body?.poId);
            const receiptNo = toStr(body?.receiptNo);
            const receiptType = toStr(body?.receiptType); // kept
            const receiptDate = toStr(body?.receiptDate);
            const porCounts = body?.porCounts ?? {};
            const porMetaData = body?.porMetaData ?? {};

            if (!poId) return bad("Missing poId.", 400);
            if (!receiptNo) return bad("Receipt Number is required.", 400);
            if (!receiptType) return bad("Receipt Type is required.", 400);
            if (!receiptDate) return bad("Receipt Date is required.", 400);

            const entries = Object.entries(porCounts || {}).map(([k, v]) => ({
                porId: toNum(k),
                qty: Math.max(0, toNum(v)),
            }));
            const anyQty = entries.some((x) => x.porId && x.qty > 0);
            if (!anyQty) return bad("No scanned RFIDs to save.", 400);

            for (const it of entries) {
                if (!it.porId || it.qty <= 0) continue;

                const por = await fetchPORById(base, it.porId);
                if (!por) return bad("Some scanned items do not belong to this PO.", 400);

                const ownerPoId = toNum(por?.purchase_order_id);
                if (!ownerPoId || ownerPoId !== poId) return bad("Some scanned items do not belong to this PO.", 400);

                const isPosted = toNum(por?.isPosted) === 1;
                if (isPosted) continue;

                const productId = toNum(por?.product_id);
                const branchId = toNum(por?.branch_id);

                // expected qty + popId
                const line = await fetchSinglePOLineByKey(base, poId, productId, branchId);
                const expectedQty = Math.max(0, toNum(line?.ordered_quantity));
                const popId = toNum(line?.purchase_order_product_id);

                // tagged qty for this line (POR+POP)
                const taggedRows = await fetchReceivingItemsByLinkIds(base, [it.porId, popId].filter(Boolean));
                const taggedQty = Array.isArray(taggedRows) ? taggedRows.length : 0;
                if (taggedQty <= 0) continue;

                const currentReceived = effectiveReceivedQty(por);
                const cap = expectedQty > 0 ? expectedQty : taggedQty;
                const nextReceived = Math.min(cap, currentReceived + it.qty);

                const metadata = porMetaData[String(it.porId)] || {};
                const lotNo = toStr(metadata.lotNo);
                const expiry = ymdToIsoDate(toStr(metadata.expiryDate));

                const patchUrl = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(it.porId))}`;
                await fetchJson(patchUrl, {
                    method: "PATCH",
                    body: JSON.stringify({
                        receipt_no: receiptNo,
                        receipt_date: ymdToIsoDate(receiptDate),
                        received_date: nowISO(),
                        received_quantity: nextReceived,
                        isPosted: 0,
                        ...(lotNo ? { lot_no: lotNo } : {}),
                        ...(expiry ? { expiry_date: expiry } : {}),
                    }),
                });
            }

            // ✅ if fully received now, set PO date_received (best effort)
            try {
                const lines = await fetchPOProductsByPOId(base, poId);
                const porRows = await fetchPORByPOIds(base, [poId]);

                const porIds = porRows.map((r: any) => toNum(r?.purchase_order_product_id)).filter(Boolean);
                const popIds = lines.map((l: any) => toNum(l?.purchase_order_product_id)).filter(Boolean);

                const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIds, ...popIds]);
                const { taggedCountByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });

                if (isFullyReceived(poId, lines, porRows, taggedCountByKey)) {
                    await patchPO(base, poId, { date_received: nowISO() });
                }
            } catch {}

            // return updated detail
            const poReq = { ...req, json: async () => ({ action: "open_po", poId }) } as any;
            const res: NextResponse = await POST(poReq);
            const json: any = await res.json().catch(() => ({}));

            return ok({ ok: true, receiptId: receiptNo, detail: json?.data ?? null });
        }

        return bad("Unknown action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed request"), 500);
    }
}
