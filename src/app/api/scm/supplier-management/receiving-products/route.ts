// src/app/api/scm/supplier-management/receiving-products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusFetch as fetchJson } from "@/modules/supply-chain-management/supplier-management/utils/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// HELPERS
// =====================
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data }, { status });
}
function bad(error: string, status = 400) {
    return NextResponse.json({ error }, { status });
}
function toStr(v: unknown, fb = "") {
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: unknown) {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function pickNum(obj: Record<string, unknown> | null | undefined, keys: string[]) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) {
            const n = toNum(obj[k]);
            if (n !== 0) return n;
        }
    }
    return 0;
}
function pickStr(obj: Record<string, unknown> | null | undefined, keys: string[], fb = "") {
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
    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchReceivingItemsByLinkIds(base: string, linkIds: number[]) {
    if (!linkIds.length) return [];
    const out: Record<string, unknown>[] = [];
    for (const ids of chunk(Array.from(new Set(linkIds)).filter(Boolean), 250)) {
        const qs: string[] = [
            "limit=-1",
            "sort=-created_at",
            "fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at",
            `filter[purchase_order_product_id][_in]=${encodeURIComponent(ids.join(","))}`,
        ];
        const url = `${base}/items/${POR_ITEMS_COLLECTION}?${qs.join("&")}`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
        out.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return out;
}

async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: Record<string, unknown>[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
}



async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const rows: Record<string, unknown>[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows as unknown as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    return (Array.isArray(j?.data) ? j.data : []) as unknown as PoProductRow[];
}

async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(supplierIds.filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: Record<string, unknown>[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,supplier_name`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
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

    const rows: Record<string, unknown>[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${BRANCHES_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,branch_name,branch_description`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
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
    const map = new Map<number, unknown>();
    const uniq = Array.from(new Set(productIds.filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: Record<string, unknown>[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=product_id,product_name,barcode,product_code`;
        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
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

// =====================
// BUILDERS / LOGIC
// =====================
function productDisplayCode(p: unknown, productId: number) {
    const product = p as Record<string, unknown> | null;
    const pc = toStr(product?.product_code);
    const bc = toStr(product?.barcode);
    if (pc && bc && pc !== bc) return `${pc} (${bc})`;
    return pc || bc || String(productId);
}

// IMPORTANT: Only treat received_quantity as REAL when there is receipt evidence OR posted.
function hasReceiptEvidence(por: unknown) {
    const p = por as Record<string, unknown> | null;
    return Boolean(toStr(p?.receipt_no) || toStr(p?.receipt_date) || toStr(p?.received_date));
}
function effectiveReceivedQty(por: unknown) {
    const p = por as Record<string, unknown> | null;
    const posted = toNum(p?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(p?.received_quantity ?? 0));
    if (!hasReceiptEvidence(por)) return 0;
    return Math.max(0, toNum(p?.received_quantity ?? 0));
}

function buildPorIdsByKey(porRows: Record<string, unknown>[]) {
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
    porRows: Record<string, unknown>[];
    receivingItems: Record<string, unknown>[];
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

function isPartiallyTagged(poId: number, lines: PoProductRow[], taggedCountByKey: Map<string, number>) {
    if (!lines.length) return false;

    for (const ln of lines) {
        const pid = toNum(ln.product_id);
        const bid = toNum(ln.branch_id);
        const expected = Math.max(0, toNum(ln.ordered_quantity));
        if (!pid || !bid || expected <= 0) continue;

        const k = keyLine(poId, pid, bid);
        const tagged = taggedCountByKey.get(k) ?? 0;
        if (tagged > 0) return true; // ✅ Allow PO to appear in Receiving if at least 1 item is tagged
    }
    return false; // ❌ Only hide PO if absolutely nothing is tagged yet
}

function isFullyReceived(
    poId: number,
    lines: PoProductRow[],
    porRows: Record<string, unknown>[],
    taggedCountByKey: Map<string, number>
) {
    if (!lines.length) return false;

    const porIdsByKey = buildPorIdsByKey(porRows);

    const recByPor = new Map<number, number>();
    for (const r of porRows) {
        const porId = toNum(r?.purchase_order_product_id);
        if (!porId) continue;
        recByPor.set(porId, effectiveReceivedQty(r));
    }

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

function receivingStatusFrom(porRows: Record<string, unknown>[]): POStatus {
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
        const poIds = (poHeaders as Record<string, unknown>[]).map((p) => toNum(p?.purchase_order_id)).filter(Boolean);
        if (!poIds.length) return ok([] as ListItem[]);

        const poLinesAll = await fetchPOProductsByPOIds(base, poIds);
        const porRowsAll = await fetchPORByPOIds(base, poIds);

        const porIdsList = (porRowsAll as Record<string, unknown>[]).map((r) => toNum(r?.purchase_order_product_id)).filter(Boolean);
        const popIdsList = (poLinesAll as unknown as Record<string, unknown>[]).map((l) => toNum(l?.purchase_order_product_id)).filter(Boolean);

        // ✅ RFID items might be linked to POR ids OR POP ids (legacy)
        const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIdsList, ...popIdsList]);

        const { taggedCountByKey } = buildTagMapsForScopes({ poLines: poLinesAll, porRows: porRowsAll, receivingItems });

        const porByPo = new Map<number, Record<string, unknown>[]>();
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

        const supplierIds = (poHeaders as Record<string, unknown>[]).map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierMap = await fetchSupplierNames(base, supplierIds);

        const list: ListItem[] = [];

        for (const po of (poHeaders as Record<string, unknown>[])) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            // ✅ PO will show up in list as long as it's partially tagged
            const isTagged = isPartiallyTagged(poId, lines, taggedCountByKey);
            if (!isTagged) continue;

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
    } catch (e: unknown) {
        const error = e as Error;
        return bad(String(error?.message ?? error ?? "Failed to load receiving list"), 500);
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        if (action === "open_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl =
                `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
                `?fields=*,discount_type.*`;
 
             const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
             const po = (pj?.data as Record<string, unknown>) ?? null;
            if (!po) return bad("PO not found.", 404);

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);
            const porIdsList = (porRows as Record<string, unknown>[]).map((r) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const popIdsList = (lines as Record<string, unknown>[]).map((l) => toNum(l?.purchase_order_product_id)).filter(Boolean);

            const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIdsList, ...popIdsList]);
            const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });

            const ready = isPartiallyTagged(poId, lines, taggedCountByKey);
            if (!ready) return bad("PO is not ready for receiving. Please tag at least one item first.", 409);

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

            let discountPercent = pickNum(po, ["discount_percent", "discountPercent", "discount_rate", "discount_percentage"]);
            
            if (!discountPercent && (po?.discount_type as Record<string, unknown>)?.total_percent) {
                discountPercent = toNum((po.discount_type as Record<string, unknown>).total_percent);
            }

            const discountAmountHeader = pickNum(po, ["discounted_amount", "discount_amount", "discountAmount", "discount_value"]);
            const grossAmountHeader = pickNum(po, ["gross_amount", "grossAmount", "subtotal", "sub_total"]);

            if (!discountPercent && discountAmountHeader > 0 && grossAmountHeader > 0) {
                discountPercent = (discountAmountHeader / grossAmountHeader) * 100;
            }

            const discountTypeLabel =
                toStr((po?.discount_type as Record<string, unknown>)?.discount_type) ||
                pickStr(po, ["discount_type", "discountType", "discount_code", "discountCode"]) ||
                (discountPercent > 0 ? `${discountPercent.toFixed(2)}% Off` : "No Discount");

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

                const primaryPorId = porIdsForLine[0];

                const unitPrice = toNum((ln as Record<string, unknown>)?.unit_price);
                const unitDiscount = unitPrice * (discountPercent / 100);

                const item: Record<string, unknown> = {
                    id: String(primaryPorId),
                    porId: String(primaryPorId),
                    productId: String(pid),
                    name: toStr((p as { product_name?: string })?.product_name, `Product #${pid}`),
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
                arr.push(item as unknown as POItem);
                itemsByBranch.set(bid, arr);
            }

            const allocations = Array.from(itemsByBranch.entries()).map(([bid, items]) => ({
                branch: {
                    id: bid ? String(bid) : "unassigned",
                    name: bid ? toStr(branchesMap.get(bid), `Branch ${bid}`) : "Unassigned",
                },
                items: items as POItem[],
            }));

            const detail: PurchaseOrderDetail = {
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no, String(poId)),
                supplier: { id: String(sid || ""), name: supplierName },
                status: receivingStatusFrom(porRows),
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                allocations,
                createdAt: toStr((po as { date_encoded?: string })?.date_encoded || (po as { date?: string })?.date || "", nowISO()),
            };

            return ok(detail);
        }

        return bad("Invalid action.", 400);
    } catch (e: unknown) {
        const error = e as Error;
        return bad(String(error?.message ?? error ?? "Failed to process request"), 500);
    }
}
