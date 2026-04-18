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

function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
    if (!nums.length) return 0;
    const factor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    const combined = (1 - factor) * 100;
    return Number(combined.toFixed(4));
}
function nowISO() { return new Date().toISOString(); }
function keyLine(poId: number, productId: number, branchId: number) {
    return `${poId}::${productId}::${branchId}`;
}

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
    expectedQty: number;
    receivedQty: number;
    requiresRfid: true;
    taggedQty: number;
    rfids: string[];
    isReceived: boolean;
    unitPrice: number;
    discountType: string;
    discountAmount: number;
    netAmount: number;
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
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    branch_id?: number | null;
    ordered_quantity: number;
    unit_price: number;
};

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

const POR_SAFE_FIELDS = "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,lot_no,expiry_date";

async function fetchApprovedNotReceivedPOs(base: string) {
    const qs = [
        "limit=-1", "sort=-date_encoded",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,approver_id,date_approved,payment_status,inventory_status,date_received,supplier_name,total_amount",
        "filter[_or][0][inventory_status][_eq]=3", "filter[_or][1][inventory_status][_eq]=9",
        "filter[_or][2][inventory_status][_eq]=11", "filter[_or][3][inventory_status][_eq]=12",
        "filter[date_received][_null]=true", "filter[inventory_status][_neq]=6",
    ].join("&");
    const url = `${base}/items/${PO_COLLECTION}?${qs}`;
    const j = await fetchJson(url) as any;
    return j?.data ?? [];
}

async function fetchReceivingItemsByLinkIds(base: string, linkIds: number[]) {
    if (!linkIds.length) return [];
    const out: any[] = [];
    for (const ids of chunk(Array.from(new Set(linkIds)).filter(Boolean), 250)) {
        const url = `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at&filter[purchase_order_product_id][_in]=${encodeURIComponent(ids.join(","))}`;
        const j = await fetchJson(url) as any;
        out.push(...(j?.data ?? []));
    }
    return out;
}

async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: any[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url = `${base}/items/${POR_COLLECTION}?limit=-1&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
        const j = await fetchJson(url) as any;
        rows.push(...(j?.data ?? []));
    }
    return rows;
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson(url) as any;
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(supplierIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,supplier_name`;
        const j = await fetchJson(url) as any;
        for (const s of (j?.data ?? [])) map.set(toNum(s.id), toStr(s.supplier_name, "—"));
    }
    return map;
}

async function fetchBranchesMap(base: string, branchIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(branchIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${BRANCHES_COLLECTION}?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,branch_name,branch_description`;
        const j = await fetchJson(url) as any;
        for (const b of (j?.data ?? [])) map.set(toNum(b.id), toStr(b.branch_name) || toStr(b.branch_description) || `Branch ${b.id}`);
    }
    return map;
}

async function fetchProductsMap(base: string, productIds: number[]) {
    const map = new Map<number, any>();
    const uniq = Array.from(new Set(productIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${PRODUCTS_COLLECTION}?limit=-1&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}&fields=product_id,product_name,barcode,product_code`;
        const j = await fetchJson(url) as any;
        for (const p of (j?.data ?? [])) map.set(toNum(p.product_id), p);
    }
    return map;
}

function productDisplayCode(p: any, productId: number) {
    const pc = toStr(p?.product_code);
    const bc = toStr(p?.barcode);
    if (pc && bc && pc !== bc) return `${pc} (${bc})`;
    return pc || bc || String(productId);
}

function effectiveReceivedQty(por: any) {
    const posted = toNum(por?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(por?.received_quantity ?? 0));
    const evidence = Boolean(toStr(por?.receipt_no) || toStr(por?.receipt_date) || toStr(por?.received_date));
    if (!evidence) return 0;
    return Math.max(0, toNum(por?.received_quantity ?? 0));
}

function buildPorIdsByKey(porRows: any[]) {
    const map = new Map<string, number[]>();
    for (const r of porRows) {
        const k = keyLine(toNum(r.purchase_order_id), toNum(r.product_id), toNum(r.branch_id));
        const arr = map.get(k) ?? [];
        arr.push(toNum(r.purchase_order_product_id));
        map.set(k, arr);
    }
    return map;
}

function buildTagMapsForScopes(args: { poLines: any[], porRows: any[], receivingItems: any[] }) {
    const linkToKey = new Map<number, string>();
    for (const r of args.porRows) linkToKey.set(toNum(r.purchase_order_product_id), keyLine(toNum(r.purchase_order_id), toNum(r.product_id), toNum(r.branch_id)));
    for (const ln of args.poLines) linkToKey.set(toNum(ln.purchase_order_product_id), keyLine(toNum(ln.purchase_order_id), toNum(ln.product_id), toNum(ln.branch_id)));

    const rfidsByKey = new Map<string, string[]>();
    for (const it of args.receivingItems) {
        const k = linkToKey.get(toNum(it.purchase_order_product_id));
        if (!k) continue;
        const arr = rfidsByKey.get(k) ?? [];
        arr.push(toStr(it.rfid_code));
        rfidsByKey.set(k, arr);
    }
    const taggedCountByKey = new Map<string, number>();
    for (const [k, v] of rfidsByKey.entries()) taggedCountByKey.set(k, v.length);
    return { taggedCountByKey, rfidsByKey };
}

function isPartiallyTagged(poId: number, lines: any[], taggedCountByKey: Map<string, number>) {
    for (const ln of lines) {
        const k = keyLine(poId, toNum(ln.product_id), toNum(ln.branch_id));
        if ((taggedCountByKey.get(k) ?? 0) > 0) return true;
    }
    return false;
}

function isFullyReceived(poId: number, lines: any[], porRows: any[], taggedCountByKey: Map<string, number>) {
    const porIdsByKey = buildPorIdsByKey(porRows);
    const recByPor = new Map<number, number>();
    for (const r of porRows) recByPor.set(toNum(r.purchase_order_product_id), effectiveReceivedQty(r));

    for (const ln of lines) {
        const expected = toNum(ln.ordered_quantity);
        if (expected <= 0) continue;
        const k = keyLine(poId, toNum(ln.product_id), toNum(ln.branch_id));
        if ((taggedCountByKey.get(k) ?? 0) < expected) return false;
        const received = (porIdsByKey.get(k) ?? []).reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
        if (received < expected) return false;
    }
    return true;
}

function receivingStatusFrom(porRows: any[]): POStatus {
    if (porRows.some(r => toNum(r.isPosted) === 1)) return "CLOSED";
    if (porRows.some(r => effectiveReceivedQty(r) > 0 || toStr(r.receipt_no))) return "PARTIAL";
    return "OPEN";
}

// =====================
// EXPORTS
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();
        const poHeaders = await fetchApprovedNotReceivedPOs(base);
        const poIds = poHeaders.map((p: any) => toNum(p.purchase_order_id)).filter(Boolean);
        if (!poIds.length) return ok([]);

        const allLines = []; // Optimized fetching would be better, but keeping it simple
        const urlLines = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&fields=purchase_order_id,product_id,branch_id,ordered_quantity,purchase_order_product_id&filter[purchase_order_id][_in]=${poIds.join(",")}`;
        const jl = await fetchJson(urlLines) as any;
        const poLinesAll = jl?.data ?? [];

        const porRowsAll = await fetchPORByPOIds(base, poIds);
        const porIdsList = porRowsAll.map((r) => toNum(r.purchase_order_product_id));
        const popIdsList = poLinesAll.map((l: any) => toNum(l.purchase_order_product_id));

        const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porIdsList, ...popIdsList]);
        const { taggedCountByKey } = buildTagMapsForScopes({ poLines: poLinesAll, porRows: porRowsAll, receivingItems });

        const supplierMap = await fetchSupplierNames(base, poHeaders.map((p: any) => toNum(p.supplier_name)));

        const list = poHeaders.map((po: any) => {
            const poId = toNum(po.purchase_order_id);
            const lines = poLinesAll.filter((l: any) => toNum(l.purchase_order_id) === poId);
            const porRows = porRowsAll.filter((r: any) => toNum(r.purchase_order_id) === poId);

            if (!isPartiallyTagged(poId, lines, taggedCountByKey)) return null;
            if (isFullyReceived(poId, lines, porRows, taggedCountByKey)) return null;

            return {
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplierName: supplierMap.get(toNum(po.supplier_name)) || "—",
                status: receivingStatusFrom(porRows),
                totalAmount: toNum(po.total_amount),
                currency: "PHP",
                itemsCount: new Set(lines.map((l: any) => l.product_id)).size,
                branchesCount: new Set(lines.map((l: any) => l.branch_id)).size,
            };
        }).filter(Boolean);

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
            if (!poId) return bad("Missing PO ID");

            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=*,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
            const pj = await fetchJson(poUrl) as any;
            const po = pj?.data;
            if (!po) return bad("PO not found", 404);

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);
            const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porRows.map(r => toNum(r.purchase_order_product_id)), ...lines.map(l => toNum(l.purchase_order_product_id))]);
            const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });

            const productsMap = await fetchProductsMap(base, lines.map(l => toNum(l.product_id)));
            const branchesMap = await fetchBranchesMap(base, lines.map(l => toNum(l.branch_id ?? 0)));
            const porIdsByKey = buildPorIdsByKey(porRows);

            let discountPercent = pickNum(po, ["discount_percent", "discountPercent"]);
            const dType = po.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) {
                const f = dLines.reduce((acc: number, l: any) => acc * (1 - toNum(l.line_id?.percentage) / 100), 1);
                discountPercent = (1 - f) * 100;
            } else if (!discountPercent) {
                discountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));
            }

            const allocationsMap = new Map<number, POItem[]>();
            for (const ln of lines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                const p = productsMap.get(pid);
                const pors = porIdsByKey.get(k) || [];
                const receivedQty = pors.reduce((sum, id) => sum + effectiveReceivedQty(porRows.find(r => toNum(r.purchase_order_product_id) === id)), 0);
                
                const item: POItem = {
                    id: String(pors[0] || pid),
                    porId: String(pors[0] || ""),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: "—",
                    expectedQty: toNum(ln.ordered_quantity),
                    receivedQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: receivedQty >= toNum(ln.ordered_quantity),
                    unitPrice: toNum(ln.unit_price),
                    discountType: toStr(dType?.discount_type, "Standard"),
                    discountAmount: toNum(ln.unit_price) * (discountPercent/100),
                    netAmount: receivedQty * (toNum(ln.unit_price) * (1 - discountPercent/100))
                };
                const arr = allocationsMap.get(bid) ?? [];
                arr.push(item);
                allocationsMap.set(bid, arr);
            }

            return ok({
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplier: { id: String(po.supplier_name), name: "Supplier Name" },
                status: receivingStatusFrom(porRows),
                allocations: Array.from(allocationsMap.entries()).map(([bid, items]) => ({
                    branch: { id: String(bid), name: branchesMap.get(bid) || "Unassigned" },
                    items
                }))
            });
        }

        if (action === "scan_rfid") {
             const rfid = toStr(body.rfid);
             const poId = toNum(body.poId);
             const url = `${base}/items/${POR_ITEMS_COLLECTION}?limit=1&filter[rfid_code][_eq]=${rfid}&fields=*,purchase_order_product_id.purchase_order_id`;
             const j = await fetchJson(url) as any;
             const row = j?.data?.[0];
             if (!row) return bad("RFID not found", 404);
             return ok({ rfid: row.rfid_code, porId: String(row.purchase_order_product_id) });
        }

        if (action === "save_receipt") {
             const { items, receiptNo, receiptDate } = body;
             for (const it of (items || [])) {
                 await fetchJson(`${base}/items/${POR_COLLECTION}/${it.porId}`, {
                     method: "PATCH",
                     body: JSON.stringify({ receipt_no: receiptNo, receipt_date: receiptDate, received_quantity: it.qty, received_date: nowISO() })
                 }).catch(() => {});
             }
             return ok({ ok: true });
        }

        return bad("Unknown action");
    } catch (e: any) { return bad(e.message, 500); }
}