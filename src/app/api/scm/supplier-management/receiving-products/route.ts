import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// DIRECTUS CONFIG (env dependent)
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
function ymdToIsoDate(ymd: string) {
    // keep as YYYY-MM-DD for Directus date fields
    return toStr(ymd);
}

// =====================
// COLLECTIONS
// =====================
const PO_COLLECTION = "purchase_order";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const BRANCHES_COLLECTION = "branches";

const POR_COLLECTION = "purchase_order_receiving"; // parent
const POR_ITEMS_COLLECTION = "purchase_order_receiving_items"; // RFID tags table

type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

type ListItem = {
    id: string; // purchase_order_id
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    itemsCount: number;
    branchesCount: number;
};

type POItem = {
    id: string; // porId
    porId: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number; // tagged RFIDs count
    receivedQty: number; // POR.received_quantity
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

// =====================
// CHUNK HELPERS
// =====================
function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// =====================
// FETCHERS
// =====================
async function fetchReceivingItems(base: string, filterPorIds?: number[]) {
    const qs: string[] = [
        "limit=-1",
        "fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at",
    ];

    if (filterPorIds && filterPorIds.length) {
        qs.push(
            `filter[purchase_order_product_id][_in]=${encodeURIComponent(
                filterPorIds.join(",")
            )}`
        );
    }

    const url = `${base}/items/${POR_ITEMS_COLLECTION}?${qs.join("&")}`;
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchPORByIds(base: string, porIds: number[]) {
    if (!porIds.length) return [];
    const rows: any[] = [];
    for (const ids of chunk(Array.from(new Set(porIds)), 250)) {
        const url =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[purchase_order_product_id][_in]=${encodeURIComponent(
                ids.join(",")
            )}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
}

async function fetchPORByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${POR_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted`;
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchPOHeadersByIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: any[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,inventory_status`;
        const j = await fetchJson(url);
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
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
        // ✅ IMPORTANT: branches has branch_name, not name
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
        map.set(
            id,
            toStr(b?.branch_name) ||
            toStr(b?.branch_description) ||
            `Branch ${id}`
        );
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

// =====================
// BUILDERS
// =====================
function productDisplayCode(p: any, productId: number) {
    return toStr(p?.barcode) || toStr(p?.product_code) || String(productId);
}

function groupRfidsByPorId(rows: any[]) {
    const map = new Map<number, string[]>();
    for (const r of rows) {
        const porId = toNum(r?.purchase_order_product_id);
        if (!porId) continue;
        const arr = map.get(porId) ?? [];
        const code = toStr(r?.rfid_code);
        if (code) arr.push(code);
        map.set(porId, arr);
    }
    return map;
}

function buildTaggedCountByPorId(rows: any[]) {
    const map = new Map<number, number>();
    for (const r of rows) {
        const porId = toNum(r?.purchase_order_product_id);
        if (!porId) continue;
        map.set(porId, (map.get(porId) ?? 0) + 1);
    }
    return map;
}

/**
 * ✅ Correct status computation for your flow:
 * - OPEN: no receipt info and received_quantity=0 across all POR lines
 * - PARTIAL: some receipt info / received_quantity but not all fully received
 * - CLOSED: all POR lines fully received (received_quantity >= taggedQty) AND has receipt info
 */
function statusFromReceiving(porRowsForPo: any[], taggedCountByPorId: Map<number, number>): POStatus {
    if (!porRowsForPo?.length) return "OPEN";

    let anyTouched = false;
    let allDone = true;

    for (const r of porRowsForPo) {
        const porId = toNum(r?.purchase_order_product_id);
        const taggedQty = taggedCountByPorId.get(porId) ?? 0;
        const receivedQty = Math.max(0, toNum(r?.received_quantity ?? 0));

        const hasReceiptInfo =
            Boolean(toStr(r?.receipt_no)) ||
            Boolean(toStr(r?.receipt_date)) ||
            Boolean(toStr(r?.received_date));

        if (hasReceiptInfo || receivedQty > 0) anyTouched = true;

        // "done" only if may taggedQty and receivedQty covers it and receipt info exists
        const done = taggedQty > 0 && receivedQty >= taggedQty && hasReceiptInfo;

        if (!done) allDone = false;
    }

    if (allDone) return "CLOSED";
    if (anyTouched) return "PARTIAL";
    return "OPEN";
}

// =====================
// ROUTES
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();

        // 1) Load all tagged RFIDs
        const receivingItems = await fetchReceivingItems(base);
        if (!receivingItems.length) return ok([] as ListItem[]);

        const taggedCountByPorId = buildTaggedCountByPorId(receivingItems);

        // 2) receiving_items -> POR -> PO
        const porIds = receivingItems
            .map((r: any) => toNum(r?.purchase_order_product_id))
            .filter(Boolean);

        const porRows = await fetchPORByIds(base, porIds);

        const porByPo = new Map<number, any[]>();
        for (const r of porRows) {
            const poId = toNum(r?.purchase_order_id);
            if (!poId) continue;
            const arr = porByPo.get(poId) ?? [];
            arr.push(r);
            porByPo.set(poId, arr);
        }

        const poIds = Array.from(porByPo.keys());
        if (!poIds.length) return ok([] as ListItem[]);

        // 3) PO headers + suppliers
        const poHeaders = await fetchPOHeadersByIds(base, poIds);
        const supplierIds = poHeaders
            .map((p: any) => toNum(p?.supplier_name))
            .filter(Boolean);
        const supplierMap = await fetchSupplierNames(base, supplierIds);

        // 4) counts
        const itemsCountByPo = new Map<number, number>();
        const branchCountByPo = new Map<number, number>();

        for (const [poId, arr] of porByPo) {
            const products = new Set<number>();
            const branches = new Set<number>();
            for (const r of arr) {
                products.add(toNum(r?.product_id));
                branches.add(toNum(r?.branch_id));
            }
            itemsCountByPo.set(poId, products.size);
            branchCountByPo.set(poId, Array.from(branches).filter(Boolean).length);
        }

        // 5) Build list (✅ status based on POR + tagged RFIDs)
        const list: ListItem[] = poHeaders.map((po: any) => {
            const poId = toNum(po?.purchase_order_id);
            const poNumber = toStr(po?.purchase_order_no, String(poId));

            const sid = toNum(po?.supplier_name);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";

            const porForPo = porByPo.get(poId) ?? [];
            const status = statusFromReceiving(porForPo, taggedCountByPorId);

            return {
                id: String(poId),
                poNumber,
                supplierName,
                status,
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                itemsCount: itemsCountByPo.get(poId) ?? 0,
                branchesCount: branchCountByPo.get(poId) ?? 0,
            };
        });

        // newest first-ish
        list.sort((a, b) => (a.poNumber < b.poNumber ? 1 : -1));

        return ok(list);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed to load receiving list"), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        // -------------------------
        // Open PO by id (primary)
        // -------------------------
        if (action === "open_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl =
                `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
                `?fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,inventory_status`;

            const pj = await fetchJson(poUrl);
            const po = pj?.data ?? null;
            if (!po) return bad("PO not found.", 404);

            const sid = toNum(po?.supplier_name);
            const supplierMap = await fetchSupplierNames(base, sid ? [sid] : []);
            const supplierName = sid ? toStr(supplierMap.get(sid), "—") : "—";

            // POR rows for this PO
            const porRows = await fetchPORByPOId(base, poId);
            const porIds = porRows
                .map((r: any) => toNum(r?.purchase_order_product_id))
                .filter(Boolean);

            // RFIDs under those POR ids
            const receivingItems = porIds.length
                ? await fetchReceivingItems(base, porIds)
                : [];
            const rfidsByPorId = groupRfidsByPorId(receivingItems);

            // products + branches maps
            const productIds = Array.from(
                new Set(porRows.map((r: any) => toNum(r?.product_id)).filter(Boolean))
            );
            const branchIds = Array.from(
                new Set(porRows.map((r: any) => toNum(r?.branch_id)).filter(Boolean))
            );

            const productsMap = await fetchProductsMap(base, productIds);
            const branchesMap = await fetchBranchesMap(base, branchIds);

            const taggedCountByPorId = buildTaggedCountByPorId(receivingItems);
            const status = statusFromReceiving(porRows, taggedCountByPorId);

            // group items by branch
            const itemsByBranch = new Map<number, POItem[]>();

            for (const r of porRows) {
                const porId = toNum(r?.purchase_order_product_id);
                const pid = toNum(r?.product_id);
                const bid = toNum(r?.branch_id);

                const p = pid ? productsMap.get(pid) : null;
                const rfids = rfidsByPorId.get(porId) ?? [];

                const hasReceiptInfo =
                    Boolean(toStr(r?.received_date)) ||
                    Boolean(toStr(r?.receipt_no)) ||
                    Boolean(toStr(r?.receipt_date));

                const item: POItem = {
                    id: String(porId),
                    porId: String(porId),
                    productId: String(pid || ""),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: "—",
                    expectedQty: rfids.length,
                    receivedQty: Math.max(0, toNum(r?.received_quantity ?? 0)),
                    requiresRfid: true,
                    taggedQty: rfids.length,
                    rfids,
                    isReceived: hasReceiptInfo,
                };

                const arr = itemsByBranch.get(bid) ?? [];
                arr.push(item);
                itemsByBranch.set(bid, arr);
            }

            const allocations = Array.from(itemsByBranch.entries()).map(
                ([bid, items]) => ({
                    branch: {
                        id: bid ? String(bid) : "unassigned",
                        name: bid
                            ? toStr(branchesMap.get(bid), `Branch ${bid}`)
                            : "Unassigned",
                    },
                    items,
                })
            );

            const detail: PurchaseOrderDetail = {
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no, String(poId)),
                supplier: { id: String(sid || ""), name: supplierName },
                status,
                totalAmount: toNum(po?.total_amount ?? 0),
                currency: "PHP",
                allocations,
                createdAt: toStr(po?.date_encoded || po?.date || "", nowISO()),
            };

            return ok(detail);
        }

        // -------------------------
        // Backward compat verify_po
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
        // RFID scan verify (STRICT)
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
            if (!row)
                return bad(
                    "RFID not found. Tag this item first in Tagging of PO.",
                    404
                );

            const porId = toNum(row?.purchase_order_product_id);
            if (!porId) return bad("RFID record has no purchase_order_product_id.", 400);

            const porUrl =
                `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(porId))}` +
                `?fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_date,receipt_no,receipt_date,received_quantity`;

            const porj = await fetchJson(porUrl);
            const por = porj?.data ?? null;

            const ownerPoId = toNum(por?.purchase_order_id);
            if (!ownerPoId) return bad("Unable to resolve PO owner of this RFID.", 400);
            if (ownerPoId !== poId) return bad("RFID belongs to a different PO.", 400);

            const alreadyReceived =
                Boolean(toStr(por?.received_date)) ||
                Boolean(toStr(por?.receipt_no)) ||
                Boolean(toStr(por?.receipt_date)) ||
                Math.max(0, toNum(por?.received_quantity ?? 0)) > 0;

            const productId = toNum(por?.product_id ?? row?.product_id);
            const pm = await fetchProductsMap(base, productId ? [productId] : []);
            const p = productId ? pm.get(productId) : null;

            return ok({
                porId: String(porId),
                rfid: toStr(row?.rfid_code),
                productId: String(productId || ""),
                productName: toStr(p?.product_name, `Product #${productId}`),
                sku: productDisplayCode(p, productId),
                time: toStr(row?.created_at, ""),
                alreadyReceived,
            });
        }

        // -------------------------
        // Save receipt (updates POR rows)
        // -------------------------
        if (action === "save_receipt") {
            const poId = toNum(body?.poId);
            const receiptNo = toStr(body?.receiptNo);
            const receiptType = toStr(body?.receiptType);
            const receiptDate = toStr(body?.receiptDate);
            const porCounts = body?.porCounts ?? {};

            if (!poId) return bad("Missing poId.", 400);
            if (!receiptNo) return bad("Receipt Number is required.", 400);
            if (!receiptType) return bad("Receipt Type is required.", 400);
            if (!receiptDate) return bad("Receipt Date is required.", 400);

            const entries = Object.entries(porCounts || {}).map(([k, v]) => ({
                porId: toNum(k),
                qty: Math.max(0, toNum(v)),
            }));

            if (!entries.length) return bad("No scanned RFIDs to save.", 400);

            for (const it of entries) {
                if (!it.porId || it.qty <= 0) continue;

                const patchUrl = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(it.porId))}`;
                await fetchJson(patchUrl, {
                    method: "PATCH",
                    body: JSON.stringify({
                        receipt_no: receiptNo,
                        receipt_date: ymdToIsoDate(receiptDate),
                        received_date: nowISO(),
                        received_quantity: it.qty,
                        isPosted: 0,
                    }),
                });
            }

            // return updated detail so UI refreshes
            const poReq = { ...req, json: async () => ({ action: "open_po", poId }) } as any;
            const res = await POST(poReq);
            const json = await res.json().catch(() => ({}));

            return ok({
                ok: true,
                receiptId: receiptNo,
                detail: json?.data ?? null,
            });
        }

        return bad("Unknown action.", 400);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed request"), 500);
    }
}
