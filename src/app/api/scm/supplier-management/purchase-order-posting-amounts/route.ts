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
    if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        return toStr(obj.name ?? obj.discount_type ?? obj.discount_code ?? obj.value ?? fb);
    }
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: unknown): number {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function nowISO() {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    return formatter.format(d).replace(' ', 'T') + 'Z';
}

function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n > 0 && n <= 100);
    if (!nums.length) return 0;
    const f = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - f) * 100).toFixed(4));
}

function calculateDiscountFromLines(lines: Array<Record<string, unknown>>): number {
    if (!lines || !lines.length) return 0;
    const factor = lines.reduce((acc: number, l: Record<string, unknown>) => {
        const pidObj = l?.line_id as Record<string, unknown> | undefined;
        const p = toNum(pidObj?.percentage ?? l?.percentage ?? 0);
        return acc * (1 - p / 100);
    }, 1);
    return Number(((1 - factor) * 100).toFixed(4));
}

function resolveDiscountPercent(dt: Record<string, unknown> | null | undefined): number {
    if (!dt) return 0;
    const lines = (dt.line_per_discount_type as Array<Record<string, unknown>>) ?? [];
    const totalPct = toNum(dt.total_percent);
    const name = toStr(dt.discount_type || dt.name);

    if (lines.length > 0) {
        return calculateDiscountFromLines(lines);
    }
    if (totalPct > 0) {
        return totalPct;
    }
    return deriveDiscountPercentFromCode(name);
}
function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
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

type POStatus = "OPEN" | "PARTIAL" | "RECEIVED" | "CLOSED";
interface Supplier { id: number; supplier_name: string; }
interface Branch { id: number; branch_name: string; branch_description: string; }
interface Product { product_id: number; product_name: string; barcode: string; product_code: string; cost_per_unit?: number; }
interface POHeader {
    purchase_order_id: number;
    purchase_order_no: string;
    date: string;
    date_encoded: string;
    supplier_name: number | string;
    total_amount: number | string;
    date_received: string;
    inventory_status: string;
    gross_amount: number | string;
    discounted_amount: number | string;
    vat_amount: number | string;
    withholding_tax_amount?: number | string;
    discount_type?: string | number | Record<string, unknown> | null;
    is_posted?: boolean | number | string | null;
}
interface PORRow {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    branch_id: number;
    received_quantity: number | string;
    receipt_no: string;
    receipt_date: string;
    received_date: string;
    isPosted: number | string;
    is_posted_amounts?: number | string;
    discounted_amount: number | string;
    vat_amount: number | string;
    withholding_amount: number | string;
    unit_price: number | string;
    total_amount: number | string;
    is_reverted?: number | string | null;
}
interface ReceivingItem {
    receiving_item_id: number;
    purchase_order_product_id: number;
    product_id: number;
    rfid_code: string;
    created_at: string;
}

const POR_SAFE_FIELDS =
    "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,is_posted_amounts,discounted_amount,vat_amount,withholding_amount,total_amount,unit_price";

// =====================
// FETCHERS
// =====================
async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set((supplierIds || []).filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: Supplier[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,supplier_name`;
        const j = await fetchJson(url) as { data: Supplier[] };
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
    const uniq = Array.from(new Set((branchIds || []).filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: Branch[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${BRANCHES_COLLECTION}?limit=-1` +
            `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=id,branch_name,branch_description`;
        const j = await fetchJson(url) as { data: Branch[] };
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
    const map = new Map<number, Product>();
    const uniq = Array.from(new Set((productIds || []).filter((n) => n > 0)));
    if (!uniq.length) return map;

    const rows: (Product & { id?: number })[] = [];
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=product_id,product_name,barcode,product_code,cost_per_unit`;
        const j = await fetchJson(url) as { data: (Product & { id?: number })[] };
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
            cost_per_unit: toNum(p?.cost_per_unit),
        });
    }
    return map;
}

type PoProductRow = {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    branch_id?: number | null;
    ordered_quantity: number;
    unit_price?: number;
    total_amount?: number;
    discount_type?: number | string | null;
    received?: number | string | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const rows: PoProductRow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount,received`;
        const j = await fetchJson(url) as { data: PoProductRow[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount,received`;
    const j = await fetchJson(url) as { data: PoProductRow[] };
    return (Array.isArray(j?.data) ? j.data : []) as PoProductRow[];
}



async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: PORRow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
        const j = await fetchJson(url) as { data: PORRow[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
}

async function fetchReceivingItems(base: string, filterPorIds?: number[]) {
    const qs: string[] = [
        "limit=-1",
        "fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at",
    ];
    if (filterPorIds && filterPorIds.length) {
        qs.push(`filter[purchase_order_product_id][_in]=${encodeURIComponent(filterPorIds.join(","))}`);
    }
    const url = `${base}/items/${POR_ITEMS_COLLECTION}?${qs.join("&")}`;
    const j = await fetchJson(url) as { data: ReceivingItem[] };
    return Array.isArray(j?.data) ? j.data : [];
}

async function patchPO(base: string, poId: number, payload: unknown) {
    const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) });
}

async function patchPOR(base: string, porId: number, payload: unknown) {
    const url = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(porId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) });
}

async function fetchProductSupplierLinks(base: string, supplierId: number) {
    const fields = encodeURIComponent("id,product_id,supplier_id,discount_type.*,discount_type.line_per_discount_type.line_id.*");
    const url =
        `${base}/items/product_per_supplier?limit=-1` +
        `&filter[supplier_id][_eq]=${encodeURIComponent(String(supplierId))}` +
        `&fields=${fields}`;
    const j = await fetchJson(url) as { data: Array<Record<string, unknown>> };
    const rows = Array.isArray(j?.data) ? j.data : [];
    const map = new Map<number, Record<string, unknown>>();
    for (const r of rows) {
        const pid = toNum(r?.product_id);
        if (pid) map.set(pid, r);
    }
    return map;
}

async function fetchProductSupplierLinksBySids(base: string, supplierIds: number[]) {
    const fields = encodeURIComponent("id,product_id,supplier_id,discount_type.*,discount_type.line_per_discount_type.line_id.*");
    const uniq = Array.from(new Set(supplierIds.filter(n => n > 0)));
    if (!uniq.length) return new Map<number, Map<number, Record<string, unknown>>>();

    const rows: Record<string, unknown>[] = [];
    // We already have a chunk helper in this file
    for (const ids of chunk(uniq, 250)) {
        const url =
            `${base}/items/product_per_supplier?limit=-1` +
            `&filter[supplier_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=${fields}`;
        const j = await fetchJson(url) as { data: Array<Record<string, unknown>> };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }

    const map = new Map<number, Map<number, Record<string, unknown>>>();
    for (const r of rows) {
        const sid = toNum(r?.supplier_id);
        const pid = toNum(r?.product_id);
        if (sid && pid) {
            if (!map.has(sid)) map.set(sid, new Map());
            map.get(sid)!.set(pid, r);
        }
    }
    return map;
}

// =====================
// BUILDERS / LOGIC
// =====================
function productDisplayCode(p: Product | null, productId: number) {
    return toStr(p?.barcode) || toStr(p?.product_code) || String(productId);
}

function groupRfidsByPorId(rows: ReceivingItem[]) {
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

function hasReceiptEvidence(por: PORRow) {
    return Boolean(toStr(por?.receipt_no) || toStr(por?.receipt_date) || toStr(por?.received_date));
}

function effectiveReceivedQty(por: PORRow) {
    if (toNum(por?.is_reverted) === 1) return 0;
    // IMPORTANT: treat numeric/string consistently
    const posted = toNum(por?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(por?.received_quantity ?? 0));
    if (!hasReceiptEvidence(por)) return 0;
    return Math.max(0, toNum(por?.received_quantity ?? 0));
}

function buildPorIdsByKey(porRows: PORRow[]) {
    const map = new Map<string, number[]>();
    for (const r of porRows) {
        const poId = toNum(r?.purchase_order_id);
        const pid = toNum(r?.product_id);
        const bid = toNum(r?.branch_id);
        const porId = toNum(r?.purchase_order_product_id);
        if (!poId || !pid || !porId) continue;
        const k = keyLine(poId, pid, bid);
        const arr = map.get(k) ?? [];
        arr.push(porId);
        map.set(k, arr);
    }
    return map;
}

function isPartiallyReceivedOrTagged(
    poId: number,
    lines: PoProductRow[],
    porRows: PORRow[],
    rfidsByPorId: Map<number, string[]>
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
        if (!pid || expected <= 0) continue;

        const porIds = porIdsByKey.get(keyLine(poId, pid, bid)) ?? [];
        if (!porIds.length) continue;

        const taggedQty = porIds.reduce((sum, id) => sum + (rfidsByPorId.get(id) ?? []).length, 0);
        if (taggedQty > 0) return true;
        
        const receivedQty = porIds.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
        if (receivedQty > 0) return true;
    }
    return false;
}

function isFullyReceived(
    poId: number,
    lines: PoProductRow[],
    porRows: PORRow[]
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
        if (!pid || expected <= 0) continue;

        const porIds = porIdsByKey.get(keyLine(poId, pid, bid)) ?? [];
        if (!porIds.length) return false;

        const receivedQty = porIds.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
        if (receivedQty < expected) return false;
    }

    return true;
}

function isPartiallyTagged() {
    // If no RFID tags are used at all in this PO, we allow posting.
    // Generally we don't block manual flows here.
    return true; 
}

type PostingReceipt = {
    receiptNo: string;
    receiptDate: string;
    linesCount: number;
    totalReceivedQty: number;
    isPosted: 0 | 1;
    statusLabel: string;
    grossAmount: number;
    discountAmount: number;
    vatAmount: number;
    withholdingTaxAmount: number;
    totalAmount: number;
};

function buildReceiptSummary(porRows: PORRow[], priceMap?: Map<number, number>, discMap?: Map<number, number>) {
    const groups = new Map<string, PORRow[]>();

    for (const r of porRows ?? []) {
        if (toNum(r?.is_reverted) === 1) continue;
        const rn = toStr(r?.receipt_no);
        if (!rn) continue;
        const arr = groups.get(rn) ?? [];
        arr.push(r);
        groups.set(rn, arr);
    }

    const receipts: PostingReceipt[] = [];

    for (const [receiptNo, rows] of Array.from(groups.entries())) {
        const porIds = new Set<number>();
        let bestDate = "";
        let total = 0;
        let allPosted = true;
        let allAmountPosted = true;
        let gross = 0;
        let disc = 0;
        let vat = 0;
        let wht = 0;

        for (const r of rows) {
            const porId = toNum(r?.purchase_order_product_id);
            if (porId) porIds.add(porId);

            const d = toStr(r?.received_date) || toStr(r?.receipt_date);
            if (d) {
                if (!bestDate || new Date(d).getTime() >= new Date(bestDate).getTime()) bestDate = d;
            }

            const qty = effectiveReceivedQty(r);
            total += qty;
            if (toNum(r?.isPosted) !== 1) allPosted = false;
            if (toNum(r?.is_posted_amounts) !== 1) allAmountPosted = false;

            const price = priceMap?.get(porId) || 0;
            const rowDisc = (discMap?.get(porId) || 0) * qty;

            gross += (price * qty);
            disc += rowDisc;
            vat += toNum(r?.vat_amount || 0);
            wht += toNum(r?.withholding_amount || 0);
        }

        // ✅ Only show receipts that are fully inventory-posted
        if (!allPosted) continue;

        const statusLabel = allAmountPosted ? "POSTED AMOUNTS" : "POSTED INVENTORY";

        receipts.push({
            receiptNo,
            receiptDate: bestDate,
            linesCount: porIds.size,
            totalReceivedQty: total,
            isPosted: allAmountPosted ? 1 : 0, // ✅ Reflect financial posting status in this module
            statusLabel,
            grossAmount: gross,
            discountAmount: disc,
            vatAmount: vat,
            withholdingTaxAmount: wht,
            totalAmount: gross - disc,
        });
    }

    receipts.sort((a, b) => {
        const ad = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
        const bd = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
        if (bd !== ad) return bd - ad;
        return a.receiptNo < b.receiptNo ? 1 : -1;
    });

    const receiptsCount = receipts.length;
    // ✅ Count receipts that are inventory-posted BUT NOT yet amount-posted (ready for action)
    const unpostedReceiptsCount = receipts.filter((r) => r.isPosted === 0).length;

    return { receipts, receiptsCount, unpostedReceiptsCount };
}

function receivingStatusFrom(porRows: PORRow[], opts?: { isClosed?: boolean; fullyReceived?: boolean; hasAnyPosted?: boolean }) {
    if (opts?.isClosed) return "CLOSED" as POStatus;
    if (opts?.hasAnyPosted) return "PARTIAL_POSTED" as POStatus;
    if (opts?.fullyReceived) return "FOR POSTING" as POStatus;

    const anyActivity = (porRows ?? []).some((r) => {
        return effectiveReceivedQty(r) > 0 || hasReceiptEvidence(r);
    });

    return anyActivity ? "PARTIAL" : "OPEN";
}

function latestReceiptInfo(porRows: PORRow[]) {
    let best: { receipt_no: string; receipt_date: string; received_date: string } = {
        receipt_no: "",
        receipt_date: "",
        received_date: "",
    };

    for (const r of porRows ?? []) {
        const rn = toStr(r?.receipt_no);
        const rd = toStr(r?.receipt_date);
        const rcd = toStr(r?.received_date);
        const ts = rcd || rd;
        const bestTs = best.received_date || best.receipt_date;

        if (!ts) continue;
        if (!bestTs || new Date(ts).getTime() >= new Date(bestTs).getTime()) {
            best = { receipt_no: rn, receipt_date: rd, received_date: rcd };
        }
    }

    return best;
}

function branchesLabelFromLines(lines: PoProductRow[], branchesMap: Map<number, string>) {
    const names = Array.from(
        new Set(
            lines
                .map((l) => toNum(l.branch_id))
                .filter(Boolean)
                .map((bid) => toStr(branchesMap.get(bid), `Branch ${bid}`))
        )
    ).filter(Boolean);
    return names.length ? names.join(", ") : "—";
}

// =====================
// TYPES (API OUTPUT)
// =====================
type PostingListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    itemsCount: number;
    branchesCount: number;
    receiptsCount: number;
    unpostedReceiptsCount: number;
    postingReady: boolean;
    latestReceiptNo?: string;
    latestReceiptDate?: string;
};

type PostingPOItem = {
    id: string;
    porId: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number;
    taggedQty: number;
    receivedQty: number;
    rfids: string[];
    isReceived: boolean;
    unitPrice: number;
    grossAmount: number;
    discountAmount: number;
    netAmount: number;
    discountTypeId?: string;
    discountLabel?: string;
    receiptNo?: string;
    receiptDate?: string;
};

type PostingPODetail = {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string };
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    branchName: string;
    allocations: Array<{
        branch: { id: string; name: string };
        items: PostingPOItem[];
    }>;
    receipts: PostingReceipt[];
    receiptsCount: number;
    unpostedReceiptsCount: number;
    createdAt: string;
    postingReady: boolean;
    latestReceiptNo?: string;
    latestReceiptDate?: string;
    grossAmount: number;
    discountAmount: number;
    vatAmount: number;
    withholdingTaxAmount?: number;
};

// =====================
// ROUTES
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();

        // ✅ STRATEGY: Post Amounts accepts POs with inventory-posted receipts that are NOT yet financially posted.
        // Include status 9 (Partially Received) because individual receipts can be amount-posted before full PO receiving.
        const poHeaderUrl =
            `${base}/items/${PO_COLLECTION}?limit=-1` +
            `&filter[inventory_status][_in]=6,9,13` +
            `&filter[_or][0][is_posted][_eq]=0` +
            `&filter[_or][1][is_posted][_null]=true` +
            `&fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted`;

        const poHeaderJ = await fetchJson(poHeaderUrl) as { data: POHeader[] };
        const poHeaders = Array.isArray(poHeaderJ?.data) ? poHeaderJ.data : [];
        if (!poHeaders.length) return ok([] as PostingListItem[]);

        const rawPoIds = poHeaders.map(p => toNum(p?.purchase_order_id)).filter(Boolean) as number[];
        const [poLinesAll, porRowsAllPre] = await Promise.all([
            fetchPOProductsByPOIds(base, rawPoIds),
            fetchPORByPOIds(base, rawPoIds)
        ]);

        const candidatePoIds = poHeaders.filter(po => {
            const poId = toNum(po?.purchase_order_id);
            const pors = porRowsAllPre.filter(r => toNum(r.purchase_order_id) === poId);
            const lines = poLinesAll.filter(l => toNum(l.purchase_order_id) === poId);

            const fully = isFullyReceived(poId, lines, pors);
            const allInvPosted = pors.length > 0 && pors.every(r => toNum(r.isPosted) === 1);
            const allAmtPosted = pors.length > 0 && pors.every(r => toNum(r.is_posted_amounts) === 1);
            const allLinesReceived = lines.length > 0 && lines.every(l => toNum(l.received) === 1);
            const isClosed = fully && allInvPosted && allAmtPosted && allLinesReceived;
            
            const hasAnyInvPosted = pors.some((r) => toNum(r?.isPosted) === 1);
            return hasAnyInvPosted && !isClosed;
        }).map(p => toNum(p?.purchase_order_id)).filter(Boolean) as number[];

        const porRowsAll = porRowsAllPre.filter(r => candidatePoIds.includes(toNum(r.purchase_order_id)));

        const porByPo = new Map<number, PORRow[]>();
        const porIdsAll: number[] = [];
        for (const r of porRowsAll) {
            const poId = toNum(r?.purchase_order_id);
            const porId = toNum(r?.purchase_order_product_id);
            if (porId) porIdsAll.push(porId);
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

        // RFID tags
        // Supplier & Product IDs
        const supplierIds = poHeaders.map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const allProductIds = Array.from(new Set(Array.from(linesByPo.values()).flatMap(rows => rows.map(r => toNum(r.product_id)).filter(Boolean))));

        // Parallel fetch
        const [receivingItemsUncasted, supplierNamesMap, productsMap, allPslMapBySid] = await Promise.all([
            porIdsAll.length ? fetchReceivingItems(base, porIdsAll) : Promise.resolve([]),
            fetchSupplierNames(base, supplierIds),
            fetchProductsMap(base, allProductIds as number[]),
            fetchProductSupplierLinksBySids(base, supplierIds)
        ]);
        const receivingItems = receivingItemsUncasted as ReceivingItem[];
        
        groupRfidsByPorId(receivingItems);

        const list: PostingListItem[] = [];

        for (const po of poHeaders) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            // ✅ Double-check: Skip if is_posted is already true (belt-and-suspenders)
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            const fully = isFullyReceived(poId, lines, porRows);

            // Allow PO to stay in the list if it has any inventory-posted receipts and is not fully closed yet
            const hasAnyInvPosted = porRows.some((r) => toNum(r?.isPosted) === 1);
            if (!hasAnyInvPosted) continue;

            const sid = toNum(po?.supplier_name);
            const supplierName = sid ? toStr(supplierNamesMap.get(sid), "—") : "—";

            const poNumber = toStr(po?.purchase_order_no, String(poId));

            const products = new Set<number>();
            const branches = new Set<number>();
            for (const ln of lines) {
                const pid = toNum(ln?.product_id);
                const bid = toNum(ln?.branch_id);
                if (pid) products.add(pid);
                if (bid) branches.add(bid);
            }
            // Include products from POR rows (Extra items)
            for (const r of porRows) {
                const pid = toNum(r?.product_id);
                const bid = toNum(r?.branch_id);
                if (pid) products.add(pid);
                if (bid) branches.add(bid);
            }

            const lr = latestReceiptInfo(porRows);
            const rs = buildReceiptSummary(porRows);
            const allInvPosted = porRows.length > 0 && porRows.every(r => toNum(r.isPosted) === 1);
            const allAmtPosted = porRows.length > 0 && porRows.every(r => toNum(r.is_posted_amounts) === 1);
            const allLinesReceived = lines.length > 0 && lines.every(l => toNum(l.received) === 1);
            const isClosed = fully && allInvPosted && allAmtPosted && allLinesReceived;
            const fullyReceived = fully && !isClosed;

            // If the PO is truly closed across all receipts, skip it in the open list
            if (isClosed) continue;

            // Align totalAmount with what's actually being posted (Items already received but NOT YET posted to inventory)
            // readyRows: all receipts that are already posted to inventory
            const readyRows = porRows.filter(r => toNum(r.isPosted) === 1 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)));
            let listTotal = 0;
            if (readyRows.length > 0) {
                const sid = toNum(po?.supplier_name);
                const psl = sid ? (allPslMapBySid.get(sid) || new Map()) : new Map();
                const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
                const poDiscPct = resolveDiscountPercent(poDType);

                for (const r of readyRows) {
                    const pid = toNum(r.product_id);
                    const bid = toNum(r.branch_id);
                    const qty = effectiveReceivedQty(r);
                    const matchLine = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                    const p = productsMap.get(pid);

                    // Prioritize live Product Master cost for unposted rows in the list view
                    const unitPrice = toNum(p?.cost_per_unit) || toNum(matchLine?.unit_price) || 0;
                    const link = psl.get(pid);
                    const discPct = link ? resolveDiscountPercent(link.discount_type) : poDiscPct;

                    const lineGross = unitPrice * qty;
                    const lineDisc = Number((lineGross * (discPct / 100)).toFixed(2));
                    const lineNet = Number((lineGross - lineDisc).toFixed(2));
                    
                    listTotal += lineNet; // simplified for listing
                }
            } else {
                listTotal = Number((toNum(po?.total_amount) - toNum(po?.discounted_amount)).toFixed(2));
            }

            const itemsInReceipts = new Set<number>();
            for (const r of readyRows) {
                const pid = toNum(r?.product_id);
                if (pid) itemsInReceipts.add(pid);
            }

            list.push({
                id: String(poId),
                poNumber,
                supplierName,
                status: receivingStatusFrom(porRows, {
                    isClosed,
                    fullyReceived,
                    hasAnyPosted: true, // we know it has some because of hasAnyInvPosted check
                }),
                totalAmount: listTotal,
                currency: "PHP",
                itemsCount: itemsInReceipts.size > 0 ? itemsInReceipts.size : products.size,
                branchesCount: branches.size,
                receiptsCount: rs.receiptsCount,
                unpostedReceiptsCount: rs.unpostedReceiptsCount,
                postingReady: true,
                latestReceiptNo: lr.receipt_no || undefined,
                latestReceiptDate: lr.received_date || lr.receipt_date || undefined,
            });
        }

        list.sort((a, b) => (a.poNumber < b.poNumber ? 1 : -1));
        return ok(list);
    } catch (e: unknown) {
        const err = e as Error;
        return bad(String(err?.message ?? e ?? "Failed to load posting list"), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body?.action);

        // -------------------------
        // open_po
        // -------------------------
        if (action === "open_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl =
                `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}` +
                `?fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,price_type,is_posted`;

            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data ?? null;
            if (!po) return bad("PO not found.", 404);

            // ✅ We intentionally allow loading fully posted POs in this module
            // so the frontend can display the updated "Fully Posted" state.
            // The lock is strictly enforced during modify actions (post_receipt, post_all).
            // if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
            //     return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            // }

            const sid = toNum(po?.supplier_name);

            // 🚀 Stage 1: Parallel fetch independent data
            const [lines, porRows, supplierMap, productSupplierLinks] = await Promise.all([
                fetchPOProductsByPOId(base, poId),
                fetchPORByPOIds(base, [poId]),
                fetchSupplierNames(base, sid ? [sid] : []),
                sid ? fetchProductSupplierLinks(base, sid) : Promise.resolve(new Map())
            ]);

            const porIds = porRows.map((r: PORRow) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const productIds = Array.from(new Set([
                ...lines.map((x) => toNum(x.product_id)),
                ...porRows.map((x) => toNum(x.product_id))
            ].filter(Boolean)));
            const branchIds = Array.from(new Set([
                ...lines.map((x) => toNum(x.branch_id)),
                ...porRows.map((x) => toNum(x.branch_id))
            ].filter(Boolean)));

            // 🚀 Stage 2: Parallel fetch dependent data
            const [receivingItems, productsMap, branchesMap] = await Promise.all([
                porIds.length ? fetchReceivingItems(base, porIds) : Promise.resolve([]),
                fetchProductsMap(base, productIds),
                fetchBranchesMap(base, branchIds)
            ]);

            const rfidsByPorId = groupRfidsByPorId(receivingItems);
            const receivingOk = isPartiallyReceivedOrTagged(poId, lines, porRows, rfidsByPorId);
            const invStatus = toNum(po?.inventory_status);
            
            // ✅ Check for receipts ready for amount posting (inventory-posted but NOT yet amount-posted)
            const hasReadyForAmounts = porRows.some((r) => toNum(r?.isPosted) === 1 && toNum(r?.is_posted_amounts) !== 1);
            if (!receivingOk && !hasReadyForAmounts && invStatus !== 13) {
                return bad("PO is not ready for amount posting. No inventory-posted receipts available.", 409);
            }

            const fully = isFullyReceived(poId, lines, porRows);
            const supplierName = sid ? toStr(supplierMap.get(sid)) : toStr(po?.supplier_name);

            // Removed redundant RFID fetching (already handled above)
            
            const porPriceMap = new Map<number, number>();
            const porDiscMap = new Map<number, number>();

            // ── Resolve PO-level discount percent (Total Percent Source of Truth) ──
            const poDType = po?.discount_type as Record<string, unknown> | null;
            const poDiscountName = toStr(poDType?.discount_type || poDType?.name, "");
            const poDiscountPercent = resolveDiscountPercent(poDType);

            const porIdsByKey = buildPorIdsByKey(porRows);

            const recByPor = new Map<number, number>();
            for (const r of porRows) {
                const porId = toNum(r?.purchase_order_product_id);
                if (!porId) continue;
                recByPor.set(porId, effectiveReceivedQty(r));
            }

            const itemsByBranch = new Map<number, PostingPOItem[]>();

            // ✅ Only include inventory-posted POR rows for allocation display
            const postedPorRows = porRows.filter(r => toNum(r.isPosted) === 1);

            // Build keys only from inventory-posted rows
            const allKeys = new Set<string>();
            postedPorRows.forEach(r => {
                if (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)) {
                    allKeys.add(`${toNum(r.product_id)}-${toNum(r.branch_id)}`);
                }
            });

            let detailGross = 0;
            let detailDisc = 0;
            let detailVat = 0;
            let detailWht = 0;
            let detailTotal = 0;
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            const allValidItems: PostingPOItem[] = [];

            for (const keyStr of Array.from(allKeys)) {
                const [pid, bid] = keyStr.split("-").map(Number);
                if (!pid || !bid) continue;

                const ln = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                const expected = Math.max(0, toNum(ln?.ordered_quantity || 0));

                const k = keyLine(poId, pid, bid);
                const porIdsForLine = porIdsByKey.get(k) ?? [];

                const p = productsMap.get(pid) ?? null;
                const linePorRowsAll = postedPorRows.filter(r => porIdsForLine.includes(toNum(r.purchase_order_product_id)));

                // Group by receipt No
                const rowsByReceipt = new Map<string, PORRow[]>();
                for (const r of linePorRowsAll) {
                    const rn = toStr(r.receipt_no);
                    const arr = rowsByReceipt.get(rn) || [];
                    arr.push(r);
                    rowsByReceipt.set(rn, arr);
                }

                const totalReceivedQty = porIdsForLine.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
                const isReceived = expected > 0 ? (totalReceivedQty >= expected) : (totalReceivedQty > 0);

                let itemDiscPct = 0;
                let discountTypeId = "";
                let resolvedLabel = "—";
                const psl = productSupplierLinks.get(pid);

                // Priority 1: Product-Supplier Link
                if (psl) {
                    const linkDt = psl.discount_type as Record<string, unknown> | null | undefined;
                    const linkName = toStr(linkDt?.discount_type || linkDt?.name);
                    const linkId = toNum(linkDt?.id || linkDt);
                    itemDiscPct = resolveDiscountPercent(linkDt);
                    if (itemDiscPct > 0 || linkName) {
                        discountTypeId = linkId ? String(linkId) : "";
                        resolvedLabel = linkName || `${Number(itemDiscPct.toFixed(2))}% Disc`;
                    }
                }

                // Priority 2: PO Header (Fallback)
                if (itemDiscPct === 0 && poDiscountPercent > 0) {
                    itemDiscPct = poDiscountPercent;
                    resolvedLabel = poDiscountName ? poDiscountName : `${Number(poDiscountPercent.toFixed(2))}% PO Disc`;
                    discountTypeId = poDType?.id ? String(poDType.id) : "";
                }

                // Prioritize live Product Master cost over stale PO line price to reflect recent updates
                const unitPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price) || 0;

                porIdsForLine.forEach(id => {
                    porPriceMap.set(id, unitPrice);
                    porDiscMap.set(id, itemDiscPct > 0 ? (unitPrice * (itemDiscPct / 100)) : 0);
                });



                for (const [receiptNo, receiptRows] of Array.from(rowsByReceipt.entries())) {
                    const receivedQty = receiptRows.reduce((sum, r) => sum + effectiveReceivedQty(r), 0);
                    if (!receiptNo && receivedQty === 0) continue; 

                    const rfids = receiptRows.flatMap(r => rfidsByPorId.get(toNum(r.purchase_order_product_id)) ?? []);
                    const primaryPorId = toNum(receiptRows[0]?.purchase_order_product_id);

                    const lineGrossAmt = unitPrice * receivedQty;
                    const lineDiscount = lineGrossAmt * (itemDiscPct / 100);
                    const lineNet = lineGrossAmt - lineDiscount;

                    const item: PostingPOItem = {
                        id: String(primaryPorId || `extra-${pid}-${bid}-${receiptNo}`),
                        porId: String(primaryPorId || `extra-${pid}-${bid}-${receiptNo}`),
                        productId: String(pid),
                        name: toStr(p?.product_name, `Product #${pid}`),
                        barcode: productDisplayCode(p, pid),
                        uom: "—",
                        expectedQty: expected,
                        taggedQty: rfids.length,
                        receivedQty,
                        rfids,
                        isReceived,
                        unitPrice,
                        grossAmount: Number(lineGrossAmt.toFixed(2)),
                        discountAmount: Number(lineDiscount.toFixed(2)),
                        netAmount: Number(lineNet.toFixed(2)),
                        discountTypeId: discountTypeId || undefined,
                        discountLabel: resolvedLabel !== "—" ? resolvedLabel : undefined,
                        receiptNo: receiptNo || undefined,
                        receiptDate: toStr(receiptRows[0]?.receipt_date) || toStr(receiptRows[0]?.received_date) || undefined,
                    };

                    // For summary calculation, we use high-precision lineNet to avoid drift
                    const itemHighPrecision = {
                        ...item,
                        grossAmount: lineGrossAmt,
                        discountAmount: lineDiscount,
                        netAmount: lineNet,
                    };

                    const arr = itemsByBranch.get(bid) ?? [];
                    arr.push(item);
                    itemsByBranch.set(bid, arr);

                    if (receivedQty > 0) {
                        allValidItems.push(item);
                        
                        // Track high-precision values for the summary totals
                        detailGross += itemHighPrecision.grossAmount;
                        detailDisc += itemHighPrecision.discountAmount;

                        if (poIsInvoice) {
                            const rowVatExcl = itemHighPrecision.netAmount / 1.12;
                            const rowVat = itemHighPrecision.netAmount - rowVatExcl;
                            const rowWht = rowVatExcl * 0.01;

                            detailVat += rowVat;
                            detailWht += rowWht;
                        }
                    }

                }

                // ✅ No fallback item needed — only inventory-posted receipt rows are shown
            }

            const allocations = Array.from(itemsByBranch.entries()).map(([bid, items]) => ({
                branch: {
                    id: bid ? String(bid) : "unassigned",
                    name: bid ? toStr(branchesMap.get(bid), `Branch ${bid}`) : "Unassigned",
                },
                items,
            }));

            const lr = latestReceiptInfo(porRows);
            const rs = buildReceiptSummary(porRows, porPriceMap, porDiscMap);
            const allInvPosted = porRows.length > 0 && porRows.every(r => toNum(r.isPosted) === 1);
            const allAmtPosted = porRows.length > 0 && porRows.every(r => toNum(r.is_posted_amounts) === 1);
            const allLinesReceived = lines.length > 0 && lines.every(l => toNum(l.received) === 1);
            const isClosed = fully && allInvPosted && allAmtPosted && allLinesReceived;
            const fullyReceived = fully && !isClosed;

            const branchName = branchesLabelFromLines(lines, branchesMap);

            // ✅ OPTION B: Rounding Adjustment for Standard Accounting
            // Ensure the sum of the rounded line items exactly matches the formula-based high-precision total
            if (allValidItems.length > 0) {
                const targetTotalDisc = Number(detailDisc.toFixed(2));
                let sumRoundedDisc = 0;
                for (const it of allValidItems) sumRoundedDisc += it.discountAmount;

                const diffDisc = Number((targetTotalDisc - sumRoundedDisc).toFixed(2));
                if (diffDisc !== 0) {
                    // Apply adjustment to the last item to hide the rounding discrepancy
                    const lastItem = allValidItems[allValidItems.length - 1];
                    lastItem.discountAmount = Number((lastItem.discountAmount + diffDisc).toFixed(2));
                    lastItem.netAmount = Number((lastItem.grossAmount - lastItem.discountAmount).toFixed(2));
                }
            }

            detailGross = Number(detailGross.toFixed(2));
            detailDisc = Number(detailDisc.toFixed(2));
            detailVat = Number(detailVat.toFixed(2));
            detailWht = Number(detailWht.toFixed(2));
            detailTotal = Number((detailGross - detailDisc).toFixed(2));

            // Ensure VAT/EWT are zeroed if not an invoice as requested
            if (!poIsInvoice) {
                detailVat = 0;
                detailWht = 0;
            }


            const detail: PostingPODetail = {
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no, String(poId)),
                supplier: { id: String(sid || ""), name: supplierName },
                supplierName,
                status: receivingStatusFrom(porRows, {
                    isClosed,
                    fullyReceived,
                    hasAnyPosted: true, // we know it has some because it's open in amounts
                }),
                totalAmount: detailTotal,
                currency: "PHP",
                branchName,
                allocations,
                receipts: rs.receipts,
                receiptsCount: rs.receiptsCount,
                unpostedReceiptsCount: rs.unpostedReceiptsCount,
                createdAt: toStr(po?.date_encoded || po?.date || "", nowISO()),
                postingReady: true,
                latestReceiptNo: lr.receipt_no || undefined,
                latestReceiptDate: lr.received_date || lr.receipt_date || undefined,
                grossAmount: detailGross,
                discountAmount: detailDisc,
                vatAmount: detailVat,
                withholdingTaxAmount: detailWht,
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

            const j = await fetchJson(url) as { data: Record<string, unknown>[] };
            const row = Array.isArray(j?.data) ? j.data[0] : null;
            const poId = toNum(row?.purchase_order_id);
            if (!poId) return bad("PO not found.", 404);

            const poReq = { ...req, json: async () => ({ action: "open_po", poId }) } as unknown as NextRequest;
            return POST(poReq);
        }

        // -------------------------
        // post_receipt — post a single receipt by receiptNo
        // Allows partial posting: PO does NOT need to be fully received.
        // inventory_status → 13 (For Posting) if fully received but not all posted yet.
        // inventory_status → 6 (Received) if fully received and everything (including amounts) is posted.
        // -------------------------
        if (action === "post_receipt") {
            const poId = toNum(body?.poId);
            const receiptNo = toStr(body?.receiptNo);
            if (!poId) return bad("Missing poId.", 400);
            if (!receiptNo) return bad("Missing receiptNo.", 400);

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);



            const taggingOk = isPartiallyTagged();
            if (!taggingOk) return bad("Cannot post. Complete RFID tagging first.", 409);



            const target = porRows.filter((r: PORRow) => toStr(r?.receipt_no) === receiptNo);
            if (!target.length) return bad("Receipt not found for this PO.", 404);

            // ✅ Only post rows that are inventory-posted but NOT yet amount-posted
            const toPost = target
                .map((r: PORRow) => ({
                    porId: toNum(r?.purchase_order_product_id),
                    productId: toNum(r?.product_id),
                    branchId: toNum(r?.branch_id),
                    is_posted_amounts: toNum(r?.is_posted_amounts) === 1,
                    canPost: toNum(r?.isPosted) === 1, // Must be inventory-posted first
                    qty: effectiveReceivedQty(r),
                    rowObj: r,
                }))
                .filter((x) => x.porId && x.canPost && !x.is_posted_amounts);

            if (!toPost.length) {
                return ok({ ok: true, postedAt: nowISO(), receiptNo, message: "Nothing to post." });
            }

            // --- Persist Live Exact Values for Post ---
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=supplier_name,discount_type.*,discount_type.line_per_discount_type.line_id.*,vat_amount,withholding_tax_amount,is_posted,inventory_status,gross_amount,discounted_amount,total_amount`;
            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data;

            // Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            const sid = toNum(po?.supplier_name);
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            // PO Global Discount
            const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
            const poDiscountPercent = resolveDiscountPercent(poDType);

            const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
            const productIds = Array.from(new Set(toPost.map(x => x.productId)));
            const productsMap = await fetchProductsMap(base, productIds);

            // ✅ Track incremental totals for this receipt
            let receiptGross = 0, receiptDisc = 0, receiptNet = 0, receiptVat = 0, receiptWht = 0;

            const successfulPorIds: number[] = [];
            try {
                for (const row of toPost) {
                    const ln = lines.find(l => toNum(l.product_id) === row.productId && toNum(l.branch_id) === row.branchId);
                    const p = productsMap.get(row.productId);
                    
                    let itemDiscPct = 0;
                    let discountTypeId = "";
                    const pid = toNum(row.productId);
                    const link = psl.get(pid);
                    if (link) {
                        const linkDt = link.discount_type as Record<string, unknown> | null | undefined;
                        const linkName = toStr(linkDt?.discount_type || linkDt?.name);
                        const linkId = toNum(linkDt?.id || linkDt);

                        itemDiscPct = resolveDiscountPercent(linkDt);

                        if (itemDiscPct > 0 || linkName) {
                            discountTypeId = linkId ? String(linkId) : "";
                        }
                    }
                    
                    if (itemDiscPct === 0 && poDiscountPercent > 0) {
                        itemDiscPct = poDiscountPercent;
                        discountTypeId = poDType?.id ? String(poDType.id) : "";
                    }

                    // Prioritize live Product Master cost for saved records
                    const unitPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price) || 0;
                    const lineGross = unitPrice * row.qty;
                    const lineDisc = Number((lineGross * (itemDiscPct / 100)).toFixed(2));
                    const lineNet = Number((lineGross - lineDisc).toFixed(2));
                    
                    let rowVat = 0, rowWht = 0;
                    if (poIsInvoice) {
                        const lineVatExcl = Number((lineNet / 1.12).toFixed(2));
                        rowVat = Number((lineNet - lineVatExcl).toFixed(2));
                        rowWht = Number((lineVatExcl * 0.01).toFixed(2));
                    }

                    receiptGross += lineGross;
                    receiptDisc += lineDisc;
                    receiptNet += lineNet;
                    receiptVat += rowVat;
                    receiptWht += rowWht;

                    // ✅ Mark each row as amount-posted
                    await patchPOR(base, row.porId, { 
                        is_posted_amounts: 1,
                        unit_price: unitPrice,
                        total_amount: lineNet,
                        discounted_amount: lineDisc,
                        discount_type: discountTypeId || null,
                        vat_amount: rowVat,
                        withholding_amount: rowWht,
                    });
                    successfulPorIds.push(row.porId);
                }

                // ✅ Full Header Update: Sum previously posted receipts + current receipt
                let prevGross = 0, prevDisc = 0, prevVat = 0, prevWht = 0, prevNet = 0;
                for (const r of porRows) {
                    if (toNum(r.is_posted_amounts) === 1 && !toPost.find(p => p.porId === toNum(r.purchase_order_product_id))) {
                        const rNet = toNum(r.total_amount);
                        const rDisc = toNum(r.discounted_amount);
                        const rGross = rNet + rDisc;
                        
                        prevGross += rGross;
                        prevDisc += rDisc;
                        prevNet += rNet;
                        prevVat += toNum(r.vat_amount);
                        prevWht += toNum(r.withholding_amount);
                    }
                }

                const newGross = Number((prevGross + receiptGross).toFixed(2));
                const newDisc = Number((prevDisc + receiptDisc).toFixed(2));
                const newVat = Number((prevVat + receiptVat).toFixed(2));
                const newWht = Number((prevWht + receiptWht).toFixed(2));
                const newTotal = Number((prevNet + receiptNet).toFixed(2));

                // ✅ Check if ALL receipts are now fully done (inventory + amounts)
                const updatedPorRows = porRows.map(r => {
                    const wasPosted = toPost.find(p => p.porId === toNum(r?.purchase_order_product_id));
                    return wasPosted ? { ...r, is_posted_amounts: 1 } : r;
                });
                const allInvPosted = updatedPorRows.every(r => toNum(r.isPosted) === 1);
                const allAmtPosted = updatedPorRows.every(r => toNum(r.is_posted_amounts) === 1);
                const allLinesReceived = lines.every(l => toNum(l.received) === 1);
                const isFullyDone = allInvPosted && allAmtPosted && allLinesReceived;

                const poUpdate: Record<string, unknown> = {
                    gross_amount: newGross,
                    discounted_amount: newDisc,
                    vat_amount: newVat,
                    withholding_tax_amount: newWht,
                    total_amount: newTotal,
                };

                if (isFullyDone) {
                    poUpdate.is_posted = 1;
                    poUpdate.inventory_status = 6; // ✅ Terminal: Fully Received & Fully Posted
                } else {
                    const hasUnpostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 0 && toStr(r.receipt_no));
                    const hasAnyPostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 1);
                    if (hasAnyPostedReceipts) {
                        poUpdate.inventory_status = 9; // Partially Received
                    } else if (hasUnpostedReceipts) {
                        poUpdate.inventory_status = 13; // For Posting
                    } else {
                        poUpdate.inventory_status = 3; // For Receiving
                    }
                }

                await patchPO(base, poId, poUpdate);

                return ok({
                    ok: true,
                    postedAt: nowISO(),
                    receiptNo,
                    fullyPosted: isFullyDone,
                    partialPost: !isFullyDone,
                    message: isFullyDone ? "All amounts posted. PO is now locked." : `Receipt ${receiptNo} amounts posted successfully.`,
                });
            } catch (err) {
                console.error(`Post Amounts failed for receipt ${receiptNo}, rolling back...`, err);
                for (const porId of successfulPorIds) {
                    await patchPOR(base, porId, { is_posted_amounts: 0 }).catch(e => console.error(`Rollback failed for POR ${porId}:`, e));
                }
                return bad(`Failed to post amounts: ${(err as Error).message}. Changes rolled back.`, 500);
            }
        }

        // -------------------------
        // post_all — post ALL unposted POR rows for this PO.
        // Allows partial posting: if not fully received, PO stays at inventory_status=13
        // and remains visible in the posting list for future receipts.
        // -------------------------
        if (action === "post_all" || action === "post_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=purchase_order_id,purchase_order_no,supplier_name,inventory_status,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,total_amount`;
            const pj_po = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj_po?.data ?? null;
            if (!po) return bad("PO not found for bulk posting.", 404);

            // ✅ Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);

            // ✅ Post only inventory-posted rows that are NOT yet amount-posted
            const toPost = porRows
                .filter((r) => toNum(r.isPosted) === 1 && toNum(r.is_posted_amounts) !== 1 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)));

            if (!toPost.length) {
                return ok({ ok: true, postedAt: nowISO(), message: "Nothing to post. All eligible receipts already amount-posted." });
            }

            let sumGross = 0, sumDisc = 0, sumNet = 0, sumVat = 0, sumWht = 0;
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            const sid = toNum(po?.supplier_name);
            const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
            const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
            const poDiscPct = resolveDiscountPercent(poDType);
            const productIds = Array.from(new Set(toPost.map(r => toNum(r.product_id)).filter(Boolean)));
            const productsMap = await fetchProductsMap(base, productIds);

            const successfulPorIds: number[] = [];
            try {
                for (const r of toPost) {
                    const porId = toNum(r.purchase_order_product_id);
                    if (!porId) continue;

                    const pid = toNum(r.product_id);
                    const bid = toNum(r.branch_id);
                    const ln = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                    const p = productsMap.get(pid);
                    const qty = effectiveReceivedQty(r);
                    const uPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price) || toNum(r.unit_price) || 0;
                        
                    const link = psl.get(pid);
                    let discPct = 0;
                    let discTypeId = null;

                    if (link) {
                        const linkDt = link.discount_type as Record<string, unknown> | null | undefined;
                        discPct = resolveDiscountPercent(linkDt);
                        discTypeId = linkDt?.id || linkDt;
                    } else if (poDiscPct > 0) {
                        discPct = poDiscPct;
                        discTypeId = poDType?.id || poDType;
                    }

                    const lineGross = uPrice * qty;
                    const lineDisc = Number((lineGross * (discPct / 100)).toFixed(2));
                    const lineNet = Number((lineGross - lineDisc).toFixed(2));
                        
                    let rowVat = 0, rowWht = 0;
                    if (poIsInvoice) {
                        const lineVatExcl = Number((lineNet / 1.12).toFixed(2));
                        rowVat = Number((lineNet - lineVatExcl).toFixed(2));
                        rowWht = Number((lineVatExcl * 0.01).toFixed(2));
                    }

                    sumGross += lineGross;
                    sumDisc += lineDisc;
                    sumNet += lineNet;
                    sumVat += rowVat;
                    sumWht += rowWht;

                    // ✅ Mark each row as amount-posted
                    await patchPOR(base, porId, { 
                        is_posted_amounts: 1,
                        unit_price: uPrice,
                        total_amount: lineNet,
                        discounted_amount: lineDisc,
                        discount_type: discTypeId || null,
                        vat_amount: rowVat,
                        withholding_amount: rowWht,
                    });
                    successfulPorIds.push(porId);
                }

                // ✅ Full Header Update: Sum previously posted receipts + current posting
                let prevGross = 0, prevDisc = 0, prevVat = 0, prevWht = 0, prevNet = 0;
                for (const r of porRows) {
                    if (toNum(r.is_posted_amounts) === 1 && !toPost.find(p => toNum(p.purchase_order_product_id) === toNum(r.purchase_order_product_id))) {
                        const rNet = toNum(r.total_amount);
                        const rDisc = toNum(r.discounted_amount);
                        const rGross = rNet + rDisc;
                        
                        prevGross += rGross;
                        prevDisc += rDisc;
                        prevNet += rNet;
                        prevVat += toNum(r.vat_amount);
                        prevWht += toNum(r.withholding_amount);
                    }
                }

                const poUpdate: Record<string, unknown> = {
                    gross_amount: Number((prevGross + sumGross).toFixed(2)),
                    discounted_amount: Number((prevDisc + sumDisc).toFixed(2)),
                    vat_amount: Number((prevVat + sumVat).toFixed(2)),
                    withholding_tax_amount: Number((prevWht + sumWht).toFixed(2)),
                    total_amount: Number((prevNet + sumNet).toFixed(2)),
                };

                // ✅ Check if ALL receipts are now fully done
                const updatedPorRows = porRows.map(r => {
                    const wasPosted = toPost.find(p => toNum(p.purchase_order_product_id) === toNum(r.purchase_order_product_id));
                    return wasPosted ? { ...r, is_posted_amounts: 1 } : r;
                });
                const allInvPosted = updatedPorRows.every(r => toNum(r.isPosted) === 1);
                const allAmtPosted = updatedPorRows.every(r => toNum(r.is_posted_amounts) === 1);
                const allLinesReceived = lines.every(l => toNum(l.received) === 1);
                const isFullyDone = allInvPosted && allAmtPosted && allLinesReceived;

                if (isFullyDone) {
                    poUpdate.is_posted = 1;
                    poUpdate.inventory_status = 6; // ✅ Terminal: Fully Received & Fully Posted
                } else {
                    const hasUnpostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 0 && toStr(r.receipt_no));
                    const hasAnyPostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 1);
                    if (hasAnyPostedReceipts) {
                        poUpdate.inventory_status = 9; // Partially Received
                    } else if (hasUnpostedReceipts) {
                        poUpdate.inventory_status = 13; // For Posting
                    } else {
                        poUpdate.inventory_status = 3; // For Receiving
                    }
                }

                await patchPO(base, poId, poUpdate);

                return ok({
                    ok: true,
                    postedAt: nowISO(),
                    postedCount: toPost.length,
                    fullyPosted: isFullyDone,
                    partialPost: !isFullyDone,
                    message: isFullyDone ? "All amounts posted. PO is now locked." : `${toPost.length} receipt(s) amount-posted successfully.`,
                });
            } catch (err) {
                console.error("Post Amounts failed, rolling back...", err);
                // Rollback all successful posts in this session
                // We don't rollback the totals because we didn't patch the PO if it failed here
                for (const porId of successfulPorIds) {
                    await patchPOR(base, porId, { is_posted_amounts: 0 }).catch(e => console.error(`Rollback failed for POR ${porId}:`, e));
                }
                return bad(`Failed to post amounts: ${(err as Error).message}. Changes rolled back.`, 500);
            }
        }

        // -------------------------
        // force_post — forces receipt of PO even if there are items left to be received in post inventory.
        // Conditions: All po receipts in post amounts must be Posted (is_posted_amounts === 1).
        // -------------------------
        if (action === "force_post") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=purchase_order_id,purchase_order_no,supplier_name,inventory_status,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,total_amount`;
            const pj_po = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj_po?.data ?? null;
            if (!po) return bad("PO not found for force posting.", 404);

            // Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            const porRows = await fetchPORByPOIds(base, [poId]);

            // Check if there are any receipts that are inventory-posted (isPosted === 1) but NOT yet amount-posted (is_posted_amounts !== 1)
            const unpostedAmountsReceipts = porRows.filter(
                (r) => toNum(r.isPosted) === 1 && toNum(r.is_posted_amounts) !== 1 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no))
            );

            if (unpostedAmountsReceipts.length > 0) {
                return bad("Cannot Force Post. All existing receipts must first be posted.", 400);
            }

            // Perform PO Header force post update: setting is_posted = 1, inventory_status = 6.
            const poUpdate: Record<string, unknown> = {
                is_posted: 1,
                inventory_status: 6, // terminal: fully received and posted
            };

            await patchPO(base, poId, poUpdate);

            return ok({
                ok: true,
                postedAt: nowISO(),
                message: "Purchase Order has been forced to fully posted status. PO is now locked.",
            });
        }

        return bad("Unknown action.", 400);
    } catch (e: unknown) {
        const err = e as Error;
        return bad(String(err?.message ?? e ?? "Failed request"), 500);
    }
}