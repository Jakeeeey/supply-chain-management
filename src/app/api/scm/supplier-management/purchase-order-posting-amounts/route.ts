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
    if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        return toNum(obj.id ?? obj.value ?? obj.product_id ?? obj.supplier_id ?? obj.branch_id ?? 0);
    }
    const s = String(v ?? "").replace(/,/g, "").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}
function nowISO() {
    const date = new Date();
    const phOffset = 8 * 60; // 8 hours in minutes
    const localOffset = date.getTimezoneOffset(); // in minutes
    const phTime = new Date(date.getTime() + (phOffset + localOffset) * 60000);
    return phTime.toISOString().replace("Z", "");
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
    discounted_amount: number | string;
    vat_amount: number | string;
    withholding_amount: number | string;
    unit_price: number | string;
    total_amount: number | string;
}
interface ReceivingItem {
    receiving_item_id: number;
    purchase_order_product_id: number;
    product_id: number;
    rfid_code: string;
    created_at: string;
}

const POR_SAFE_FIELDS =
    "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,discounted_amount,vat_amount,withholding_amount,total_amount,unit_price";

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
        if (!poId || !pid || !bid || !porId) continue;
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
        if (!pid || !bid || expected <= 0) continue;

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
        if (!pid || !bid || expected <= 0) continue;

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

            const price = priceMap?.get(porId) || 0;
            const rowDisc = (discMap?.get(porId) || 0) * qty;

            gross += (price * qty);
            disc += rowDisc;
            vat += toNum(r?.vat_amount || 0);
            wht += toNum(r?.withholding_amount || 0);
        }

        receipts.push({
            receiptNo,
            receiptDate: bestDate,
            linesCount: porIds.size,
            totalReceivedQty: total,
            isPosted: allPosted ? 1 : 0,
            statusLabel: allPosted ? "READY FOR AMOUNTS" : "PENDING INVENTORY",
            grossAmount: gross, // This is actually Total (Gross+VAT) in our naming? Let's check POR logic.
            discountAmount: disc,
            vatAmount: vat,
            withholdingTaxAmount: wht,
            totalAmount: gross - disc, // Grand Total is Net (Gross - Discount)
        });
    }

    receipts.sort((a, b) => {
        const ad = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
        const bd = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
        if (bd !== ad) return bd - ad;
        return a.receiptNo < b.receiptNo ? 1 : -1;
    });

    const receiptsCount = receipts.length;
    // ✅ In Post Amounts, a receipt is "ready for amount posting" if it HAS been inventory-posted (isPosted === 1)
    const unpostedReceiptsCount = receipts.filter((r) => toNum(r.isPosted) === 1).length;

    return { receipts, receiptsCount, unpostedReceiptsCount };
}

function receivingStatusFrom(porRows: PORRow[], opts?: { isClosed?: boolean; fullyReceived?: boolean; hasAnyPosted?: boolean }) {
    // CLOSED only if fully received AND all receipts/rows are posted
    if (opts?.isClosed) return "CLOSED" as POStatus;
    // RECEIVED: all items received, receipts exist but not yet posted
    if (opts?.fullyReceived) return "FOR POSTING" as POStatus;
    // PARTIAL_POSTED: some receipts posted, some not, NOT fully received
    if (opts?.hasAnyPosted) return "PARTIAL_POSTED" as POStatus;

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

        // ✅ STRATEGY: Post Amounts only accepts FULLY RECEIVED POs (status=6) that are NOT yet financially posted.
        // Fetch PO headers directly by inventory_status=6 and is_posted is not true.
        const poHeaderUrl =
            `${base}/items/${PO_COLLECTION}?limit=-1` +
            `&filter[inventory_status][_in]=6,13` +
            `&filter[_or][0][is_posted][_eq]=0` +
            `&filter[_or][1][is_posted][_null]=true` +
            `&fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted`;

        const poHeaderJ = await fetchJson(poHeaderUrl) as { data: POHeader[] };
        const poHeaders = Array.isArray(poHeaderJ?.data) ? poHeaderJ.data : [];
        if (!poHeaders.length) return ok([] as PostingListItem[]);

        const rawPoIds = poHeaders.map(p => toNum(p?.purchase_order_id)).filter(Boolean) as number[];
        const poLinesAll = await fetchPOProductsByPOIds(base, rawPoIds);
        const porRowsAllPre = await fetchPORByPOIds(base, rawPoIds);

        const candidatePoIds = poHeaders.filter(po => {
            const poId = toNum(po?.purchase_order_id);
            const pors = porRowsAllPre.filter(r => toNum(r.purchase_order_id) === poId);
            // ✅ Gate: ALL existing receipts must be already posted to inventory
            const allInvPosted = pors.length > 0 && pors.every((r) => toNum(r?.isPosted) === 1);
            return allInvPosted;
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
        const receivingItems = (porIdsAll.length ? await fetchReceivingItems(base, porIdsAll) : []) as ReceivingItem[];
        groupRfidsByPorId(receivingItems);

        // Supplier names
        const supplierIds = poHeaders.map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierNamesMap = await fetchSupplierNames(base, supplierIds);
        
        const allProductIds = Array.from(new Set(Array.from(linesByPo.values()).flatMap(rows => rows.map(r => toNum(r.product_id)).filter(Boolean))));
        const productsMap = await fetchProductsMap(base, allProductIds as number[]);

        const list: PostingListItem[] = [];

        for (const po of poHeaders) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            // ✅ Double-check: Skip if is_posted is already true (belt-and-suspenders)
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            const fully = isFullyReceived(poId, lines, porRows);

            // Only show POs where ALL receipts are already inventory-posted.
            const allInvPosted = porRows.length > 0 && porRows.every((r) => toNum(r?.isPosted) === 1);
            if (!allInvPosted) continue;

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
            const allPosted = rs.receiptsCount > 0 && rs.unpostedReceiptsCount === 0;
            const isClosed = fully && allPosted;
            const fullyReceived = fully && !allPosted;

            // Align totalAmount with what's actually being posted (Items already received but NOT YET posted to inventory)
            // readyRows: all receipts that are already posted to inventory
            const readyRows = porRows.filter(r => toNum(r.isPosted) === 1 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)));
            let listTotal = 0;
            if (readyRows.length > 0) {
                const sid = toNum(po?.supplier_name);
                const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
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

            list.push({
                id: String(poId),
                poNumber,
                supplierName,
                status: receivingStatusFrom(porRows, {
                    isClosed,
                    fullyReceived,
                    // Only flag PARTIAL_POSTED when not fully received
                    hasAnyPosted: !fully && allInvPosted,
                }),
                totalAmount: listTotal,
                currency: "PHP",
                itemsCount: products.size,
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

            // ✅ Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);

            const porIds = porRows.map((r: PORRow) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const receivingItems = porIds.length ? await fetchReceivingItems(base, porIds) : [];
            const rfidsByPorId = groupRfidsByPorId(receivingItems);

            const receivingOk = isPartiallyReceivedOrTagged(poId, lines, porRows, rfidsByPorId);
            // Also allow opening POs that already had a partial post (inventory_status=13)
            const invStatus = toNum(po?.inventory_status);
            const hasAnyPosted = porRows.some((r) => toNum(r?.isPosted) === 1);
            if (!receivingOk && !hasAnyPosted && invStatus !== 13) {
                return bad("PO is not ready for posting. Please receive at least one item first.", 409);
            }

            const fully = isFullyReceived(poId, lines, porRows);

            const sid = toNum(po?.supplier_name);
            const supplierMap = await fetchSupplierNames(base, sid ? [sid] : []);
            const supplierName = sid ? toStr(supplierMap.get(sid)) : toStr(po?.supplier_name);

            const productIds = Array.from(new Set([
                ...lines.map((x) => toNum(x.product_id)),
                ...porRows.map((x) => toNum(x.product_id))
            ].filter(Boolean)));
            const branchIds = Array.from(new Set([
                ...lines.map((x) => toNum(x.branch_id)),
                ...porRows.map((x) => toNum(x.branch_id))
            ].filter(Boolean)));

            const productsMap = await fetchProductsMap(base, productIds);
            const branchesMap = await fetchBranchesMap(base, branchIds);
            const productSupplierLinks = sid ? await fetchProductSupplierLinks(base, sid) : new Map();

            // ── DEBUG: Log what productSupplierLinks contains ──
            console.log("[DEBUG open_po] supplierId (sid):", sid);
            console.log("[DEBUG open_po] productSupplierLinks size:", productSupplierLinks.size);
            for (const [k, v] of Array.from(productSupplierLinks.entries())) {
                console.log(`[DEBUG open_po] PSL entry: pid=${k}, discount_type=`, JSON.stringify(v?.discount_type));
            }
            // Removed redundant RFID fetching (already handled above)
            
            const porPriceMap = new Map<number, number>();
            const porDiscMap = new Map<number, number>();

            // ── Resolve PO-level discount percent (Total Percent Source of Truth) ──
            const poDType = po?.discount_type as Record<string, unknown> | null;
            const poDiscountName = toStr(poDType?.discount_type || poDType?.name, "");
            const poDiscountPercent = resolveDiscountPercent(poDType);

            console.log("[DEBUG open_po] PO-level discount:", { poDType: JSON.stringify(poDType), poDiscountName, poDiscountPercent });

            const porIdsByKey = buildPorIdsByKey(porRows);

            const recByPor = new Map<number, number>();
            for (const r of porRows) {
                const porId = toNum(r?.purchase_order_product_id);
                if (!porId) continue;
                recByPor.set(porId, effectiveReceivedQty(r));
            }

            const itemsByBranch = new Map<number, PostingPOItem[]>();

            // --- Live Sourcing vs Frozen ---

            const allKeys = new Set<string>();
            lines.forEach(ln => allKeys.add(`${toNum(ln.product_id)}-${toNum(ln.branch_id)}`));
            porRows.forEach(r => {
                if (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)) {
                    allKeys.add(`${toNum(r.product_id)}-${toNum(r.branch_id)}`);
                }
            });

            for (const keyStr of Array.from(allKeys)) {
                const [pid, bid] = keyStr.split("-").map(Number);
                if (!pid || !bid) continue;

                const ln = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                const expected = Math.max(0, toNum(ln?.ordered_quantity || 0));

                const k = keyLine(poId, pid, bid);
                const porIdsForLine = porIdsByKey.get(k) ?? [];

                const rfids = porIdsForLine.flatMap((id) => rfidsByPorId.get(id) ?? []);
                const taggedQty = rfids.length;
                const receivedQty = porIdsForLine.reduce((sum, id) => sum + (recByPor.get(id) ?? 0), 0);
                
                // For extra items, we consider them received if a record exists with qty > 0
                const isReceived = expected > 0 ? (receivedQty >= expected) : (receivedQty > 0);

                const p = productsMap.get(pid) ?? null;
                const primaryPorId = porIdsForLine[0] || (ln ? ln.purchase_order_product_id : `extra-${pid}-${bid}`);

                let unitPrice = 0;
                let lineGrossAmt = 0;
                let lineDiscount = 0;
                let lineNet = 0;
                let discountTypeId = "";
                let resolvedLabel = "—";

                let itemDiscPct = 0;
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
                unitPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price) || 0;
                
                // Recalculate everything from scratch using the resolved live unitPrice
                lineGrossAmt = unitPrice * (receivedQty || (expected > 0 ? expected : 0));
                lineDiscount = Number((lineGrossAmt * (itemDiscPct / 100)).toFixed(2));
                lineNet = Number((lineGrossAmt - lineDiscount).toFixed(2));

                const item: PostingPOItem = {
                    id: String(primaryPorId),
                    porId: String(primaryPorId),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: "—",
                    expectedQty: expected,
                    taggedQty,
                    receivedQty,
                    rfids,
                    isReceived,
                    unitPrice,
                    grossAmount: lineGrossAmt,
                    discountAmount: lineDiscount,
                    netAmount: lineNet,
                    discountTypeId: discountTypeId || undefined,
                    discountLabel: resolvedLabel !== "—" ? resolvedLabel : undefined,
                };

                porIdsForLine.forEach(id => {
                    porPriceMap.set(id, unitPrice);
                    porDiscMap.set(id, itemDiscPct > 0 ? (unitPrice * (itemDiscPct / 100)) : 0);
                });

                const arr = itemsByBranch.get(bid) ?? [];
                console.log(`[DEBUG open_po] pid=${pid} bid=${bid} unitPrice=${unitPrice} receivedQty=${receivedQty} expected=${expected} itemDiscPct=${itemDiscPct} lineGrossAmt=${lineGrossAmt} lineDiscount=${lineDiscount} lineNet=${lineNet}`);
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

            const lr = latestReceiptInfo(porRows);
            const rs = buildReceiptSummary(porRows, porPriceMap, porDiscMap);
            const allPosted = rs.receiptsCount > 0 && rs.unpostedReceiptsCount === 0;
            const isClosed = fully && allPosted;
            const fullyReceived = fully && !allPosted;

            const branchName = branchesLabelFromLines(lines, branchesMap);

            let detailGross = 0;
            let detailDisc = 0;
            let detailVat = 0;
            let detailWht = 0;
            let detailTotal = 0;

            // ALWAYS calculate footer dynamically from exact items to reflect price changes and correct formulas
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);
            
            for (const arr of Array.from(itemsByBranch.values())) {
                for (const item of arr) {
                    if (item.receivedQty > 0) {
                        detailGross += item.grossAmount;
                        detailDisc += item.discountAmount;
                        
                        if (poIsInvoice) {
                            // Standardize VAT-Inclusive Financial Formulas
                            // 1. VAT Exclusive = net_amount / 1.12
                            // 2. VAT Amount = net_amount - vat_exclusive
                            // 3. EWT Amount = vat_exclusive * 0.01
                            const rowVatExcl = Number((item.netAmount / 1.12).toFixed(2));
                            const rowVat = Number((item.netAmount - rowVatExcl).toFixed(2));
                            const rowWht = Number((rowVatExcl * 0.01).toFixed(2));

                            detailVat += rowVat;
                            detailWht += rowWht;
                        }
                    }
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
                    hasAnyPosted: !fully && hasAnyPosted,
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

            const toPost = target
                .map((r: PORRow) => ({
                    porId: toNum(r?.purchase_order_product_id),
                    productId: toNum(r?.product_id),
                    branchId: toNum(r?.branch_id),
                    posted: toNum(r?.isPosted) === 1,
                    canPost: hasReceiptEvidence(r) || effectiveReceivedQty(r) > 0,
                    qty: effectiveReceivedQty(r),
                    rowObj: r,
                }))
                .filter((x) => x.porId && x.canPost); // ✅ Removed !x.posted check because items are now ALREADY posted by Inventory module.

            if (!toPost.length) {
                return ok({ ok: true, postedAt: nowISO(), receiptNo, message: "Nothing to post." });
            }

            // --- Persist Live Exact Values for Post ---
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=supplier_name,discount_type.*,discount_type.line_per_discount_type.line_id.*,vat_amount,withholding_tax_amount,is_posted,inventory_status`;
            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data;

            // Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            // ✅ Verify PO is fully received (status 6) before allowing amount posting
            if (toNum(po?.inventory_status) !== 13 && toNum(po?.inventory_status) !== 6) {
                return bad("This PO is not fully received yet. Only fully received POs (status 13 or 6) can be posted in Amounts.", 409);
            }

            const sid = toNum(po?.supplier_name);
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            // PO Global Discount
            const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
            const poDiscountPercent = resolveDiscountPercent(poDType);

            const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
            const productIds = Array.from(new Set(toPost.map(x => x.productId)));
            const productsMap = await fetchProductsMap(base, productIds);

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

                await patchPOR(base, row.porId, { 
                    unit_price: unitPrice,
                    total_amount: lineNet,
                    discounted_amount: lineDisc,
                    discount_type: discountTypeId || null,
                    vat_amount: rowVat,
                    withholding_amount: rowWht,
                });
            }

            // ✅ Terminal Status Update:
            // If ALL receipts are now posted to inventory AND we just finished posting the amounts,
            // the PO is officially terminal (Status 6 - Received).
            const poUpdate: Record<string, unknown> = { is_posted: 1 };
            const allInvPosted = porRows.every(r => toNum(r.isPosted) === 1);
            if (allInvPosted) {
                poUpdate.inventory_status = 6;
            }

            await patchPO(base, poId, poUpdate);

            return ok({
                ok: true,
                postedAt: nowISO(),
                receiptNo,
                message: "Amounts posted successfully. PO is now locked.",
            });
        }

        // -------------------------
        // post_all — post ALL unposted POR rows for this PO.
        // Allows partial posting: if not fully received, PO stays at inventory_status=13
        // and remains visible in the posting list for future receipts.
        // -------------------------
        if (action === "post_all" || action === "post_po") {
            const poId = toNum(body?.poId);
            if (!poId) return bad("Missing poId.", 400);

            const poUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=purchase_order_id,purchase_order_no,supplier_name,inventory_status,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted`;
            const pj_po = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj_po?.data ?? null;
            if (!po) return bad("PO not found for bulk posting.", 404);

            // ✅ Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            // ✅ Verify PO is fully received (status 6) before allowing amount posting
            if (toNum(po?.inventory_status) !== 13 && toNum(po?.inventory_status) !== 6) {
                return bad("This PO is not fully received yet. Only fully received POs (status 13 or 6) can be posted in Amounts.", 409);
            }

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);

            const porIds = porRows.map((r: PORRow) => toNum(r?.purchase_order_product_id)).filter(Boolean);
            const receivingItems = porIds.length ? await fetchReceivingItems(base, porIds) : [];
            const rfidsByPorId = groupRfidsByPorId(receivingItems);

            const taggingOk = isPartiallyReceivedOrTagged(poId, lines, porRows, rfidsByPorId);
            const hasAnyActivity = porRows.some(
                (r) => effectiveReceivedQty(r) > 0 || hasReceiptEvidence(r)
            );
            const hasAnyPosted = porRows.some((r) => toNum(r?.isPosted) === 1);

            if (!taggingOk && !hasAnyActivity && !hasAnyPosted) {
                return bad("Cannot post. Please receive items in Receiving Products first.", 409);
            }

            // ✅ Verify all products are marked as received: 1
            const unreceivedProducts = lines.filter(ln => toNum(ln.ordered_quantity) > 0 && toNum(ln.received) !== 1);
            if (unreceivedProducts.length > 0) {
                return bad(`Cannot post. ${unreceivedProducts.length} items are not yet fully received in inventory.`, 409);
            }


            // Post ALL currently unposted POR rows
            const toPost = porRows
                .filter((r) => (toNum(r.received_quantity) > 0 || toStr(r.receipt_no))); // ✅ Process all received items regardless of isPosted flag (since Inventory sets it to 1)

            let sumGross = 0, sumDisc = 0, sumNet = 0, sumVat = 0, sumWht = 0;
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            if (toPost.length > 0) {
                const sid = toNum(po?.supplier_name);
                const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
                const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
                const poDiscPct = resolveDiscountPercent(poDType);
                const productIds = Array.from(new Set(toPost.map(r => toNum(r.product_id)).filter(Boolean)));
                const productsMap = await fetchProductsMap(base, productIds);

                for (const r of toPost) {
                    const porId = toNum(r.purchase_order_product_id);
                    if (!porId) continue;

                    const pid = toNum(r.product_id);
                    const bid = toNum(r.branch_id);
                    const ln = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                    const p = productsMap.get(pid);
                    const qty = effectiveReceivedQty(r);
                    // Prioritize live Product Master cost for saved records in bulk posting
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

                    await patchPOR(base, porId, { 
                        unit_price: uPrice,
                        total_amount: lineNet,
                        discounted_amount: lineDisc,
                        discount_type: discTypeId || null,
                        vat_amount: rowVat,
                        withholding_amount: rowWht,
                    });
                }
            }

            // ✅ Set is_posted = 1 on the PO header and override amounts with exact totals
            await patchPO(base, poId, { 
                is_posted: 1,
                gross_amount: Number(sumGross.toFixed(2)),
                discounted_amount: Number(sumDisc.toFixed(2)),
                vat_amount: Number(sumVat.toFixed(2)),
                withholding_tax_amount: Number(sumWht.toFixed(2)),
                total_amount: Number(sumNet.toFixed(2)),
            });

            // ✅ Terminal Status: If ALL receipts are now posted to inventory AND we just posted the amounts, set to 6 (Received)
            const allInvPostedAll = porRows.every(r => toNum(r.isPosted) === 1);
            if (allInvPostedAll) {
                await patchPO(base, poId, { inventory_status: 6 });
            }

            return ok({
                ok: true,
                postedAt: nowISO(),
                postedCount: toPost.length,
                message: "Amounts posted successfully. PO is now locked.",
            });
        }

        return bad("Unknown action.", 400);
    } catch (e: unknown) {
        const err = e as Error;
        return bad(String(err?.message ?? e ?? "Failed request"), 500);
    }
}