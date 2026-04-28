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
        return toStr((v as any).name ?? (v as any).discount_type ?? (v as any).discount_code ?? (v as any).value ?? fb);
    }
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: unknown): number {
    if (v && typeof v === "object") {
        const obj = v as any;
        return toNum(obj.id ?? obj.value ?? obj.product_id ?? obj.supplier_id ?? obj.branch_id ?? 0);
    }
    const s = String(v ?? "").replace(/,/g, "").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}
function nowISO() {
    return new Date().toISOString();
}

function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n > 0 && n <= 100);
    if (!nums.length) return 0;
    const f = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - f) * 100).toFixed(4));
}

function calculateDiscountFromLines(lines: any[]): number {
    if (!lines || !lines.length) return 0;
    const factor = lines.reduce((acc: number, l: any) => {
        const p = toNum(l?.line_id?.percentage ?? l?.percentage ?? 0);
        return acc * (1 - p / 100);
    }, 1);
    return Number(((1 - factor) * 100).toFixed(4));
}

function resolveDiscountPercent(dt: any): number {
    if (!dt) return 0;
    const lines = dt.line_per_discount_type ?? [];
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
    discount_type?: any;
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
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];
    const rows: PoProductRow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
        const j = await fetchJson(url) as { data: PoProductRow[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson(url) as { data: PoProductRow[] };
    return (Array.isArray(j?.data) ? j.data : []) as PoProductRow[];
}

async function fetchPOHeadersByIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: POHeader[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url =
            `${base}/items/${PO_COLLECTION}?limit=-1` +
            `&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}` +
            `&fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
        const j = await fetchJson(url) as { data: POHeader[] };
        rows.push(...(Array.isArray(j?.data) ? j.data : []));
    }
    return rows;
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
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) }).catch(() => {});
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
    const j = await fetchJson(url) as { data: any[] };
    const rows = Array.isArray(j?.data) ? j.data : [];
    const map = new Map<number, any>();
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
    grossAmount: number;
    discountAmount: number;
    vatAmount: number;
    withholdingTaxAmount: number;
    totalAmount: number;
};

function buildReceiptSummary(porRows: PORRow[]) {
    const groups = new Map<string, PORRow[]>();

    for (const r of porRows ?? []) {
        const rn = toStr(r?.receipt_no);
        if (!rn) continue;
        const arr = groups.get(rn) ?? [];
        arr.push(r);
        groups.set(rn, arr);
    }

    const receipts: PostingReceipt[] = [];

    for (const [receiptNo, rows] of groups.entries()) {
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

            total += effectiveReceivedQty(r);
            if (toNum(r?.isPosted) !== 1) allPosted = false;

            const whtTotal = toNum(r?.withholding_amount || 0);
            
            gross += toNum(r?.unit_price || 0) * toNum(r?.received_quantity || 0);
            disc += toNum(r?.discounted_amount || 0);
            vat += toNum(r?.vat_amount || 0);
            wht += whtTotal;
        }

        receipts.push({
            receiptNo,
            receiptDate: bestDate,
            linesCount: porIds.size,
            totalReceivedQty: total,
            isPosted: allPosted ? 1 : 0,
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
    const unpostedReceiptsCount = receipts.filter((r) => r.isPosted !== 1).length;

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

        // STRATEGY 1: POR rows with receipt/received activity that are not yet posted
        const porCandidateUrl =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[isPosted][_eq]=0` +
            `&filter[_or][0][receipt_no][_nnull]=true` +
            `&filter[_or][1][receipt_date][_nnull]=true` +
            `&filter[_or][2][received_date][_nnull]=true` +
            `&filter[_or][3][received_quantity][_gt]=0` +
            `&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;

        const candJ = await fetchJson(porCandidateUrl) as { data: PORRow[] };
        const porCandidates = Array.isArray(candJ?.data) ? candJ.data : [];

        const candidatePoIds = Array.from(
            new Set(porCandidates.map((r) => toNum(r?.purchase_order_id)).filter(Boolean))
        ) as number[];
        if (!candidatePoIds.length) return ok([] as PostingListItem[]);

        const poHeaders = await fetchPOHeadersByIds(base, candidatePoIds);
        const poLinesAll = await fetchPOProductsByPOIds(base, candidatePoIds);

        // Fetch ALL POR rows (both posted and unposted) so we can assess partial-post state
        const porRowsAll = await fetchPORByPOIds(base, candidatePoIds);

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
        const rfidsByPorId = groupRfidsByPorId(receivingItems);

        // Supplier names
        const supplierIds = poHeaders.map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierNamesMap = await fetchSupplierNames(base, supplierIds);
        
        const allProductIds = Array.from(new Set(Array.from(linesByPo.values()).flatMap(rows => rows.map(r => toNum(r.product_id)).filter(Boolean))));
        const productsMap = await fetchProductsMap(base, allProductIds as number[]);

        const list: PostingListItem[] = [];

        for (const po of poHeaders) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            // Skip fully-closed POs (inventory_status=14)
            const invStatus = toNum(po?.inventory_status);
            if (invStatus === 14) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            const taggingOk = isPartiallyReceivedOrTagged(poId, lines, porRows, rfidsByPorId);
            // ✅ Check for new statuses (6=Received, 9=Partially Received) AND legacy (12, 13)
            const eligibleByStatus = invStatus === 6 || invStatus === 9 || invStatus === 12 || invStatus === 13;
            
            // ✅ Also check if there are unposted POR rows with receipt activity
            // This catches POs whose inventory_status was never updated but DO have received items
            const hasUnpostedReceipts = porRows.some((r) => 
                toNum(r?.isPosted) === 0 && (
                    toStr(r?.receipt_no) || toStr(r?.receipt_date) || toStr(r?.received_date) || toNum(r?.received_quantity) > 0
                )
            );
            
            // Show PO if it has the right status OR has unposted receipt activity
            if (!eligibleByStatus && !hasUnpostedReceipts) continue;
            
            // If status is 12 (En Route) and nothing is tagged, skip
            if (!taggingOk && !hasUnpostedReceipts && invStatus === 12) continue;

            const fully = isFullyReceived(poId, lines, porRows);

            // hasAnyPosted: true when at least one POR row is already posted
            // This is the key signal for PARTIAL_POSTED status
            const hasAnyPosted = porRows.some((r) => toNum(r?.isPosted) === 1);

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

            const lr = latestReceiptInfo(porRows);
            const rs = buildReceiptSummary(porRows);
            const allPosted = rs.receiptsCount > 0 && rs.unpostedReceiptsCount === 0;
            const isClosed = fully && allPosted;
            const fullyReceived = fully && !allPosted;

            // Align totalAmount with what's actually being posted
            const unpostedRows = porRows.filter(r => toNum(r.isPosted) === 0 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)));
            let listTotal = 0;
            if (unpostedRows.length > 0) {
                const sid = toNum(po?.supplier_name);
                const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
                const poDType = po?.discount_type as any;
                const poDiscPct = resolveDiscountPercent(poDType);

                for (const r of unpostedRows) {
                    const pid = toNum(r.product_id);
                    const bid = toNum(r.branch_id);
                    const qty = effectiveReceivedQty(r);
                    const matchLine = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                    const p = productsMap.get(pid);

                    // Live sourcing for unposted rows in the list view
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
                    hasAnyPosted: !fully && hasAnyPosted,
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
                `?fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,price_type`;

            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data ?? null;
            if (!po) return bad("PO not found.", 404);

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
            for (const [k, v] of productSupplierLinks.entries()) {
                console.log(`[DEBUG open_po] PSL entry: pid=${k}, discount_type=`, JSON.stringify(v?.discount_type));
            }

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

            const unpostedRows = porRows.filter(r => toNum(r.isPosted) === 0 && (toStr(r.receipt_no).trim() !== "" || toNum(r.received_quantity) > 0));
            const itemsByBranch = new Map<number, PostingPOItem[]>();

            // --- Live Sourcing vs Frozen ---
            const isPoFrozen = hasAnyPosted || invStatus === 14;

            const allKeys = new Set<string>();
            lines.forEach(ln => allKeys.add(`${toNum(ln.product_id)}-${toNum(ln.branch_id)}`));
            porRows.forEach(r => allKeys.add(`${toNum(r.product_id)}-${toNum(r.branch_id)}`));

            for (const keyStr of allKeys) {
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
                    const linkDt = psl.discount_type as any;
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

                if (isPoFrozen) {
                    const linePorRows = porRows.filter(r => porIdsForLine.includes(toNum(r.purchase_order_product_id)));
                    const srcRow = linePorRows.find(r => toNum(r.isPosted) === 1) || linePorRows.find(r => toNum(r.isPosted) === 0 && !!toStr(r.receipt_no));
                    
                    unitPrice = toNum(srcRow?.unit_price) || toNum(ln?.unit_price) || toNum(p?.cost_per_unit);
                    lineGrossAmt = linePorRows.reduce((sum, r) => sum + (toNum(r.unit_price) * effectiveReceivedQty(r)), 0);
                    lineDiscount = Number((lineGrossAmt * (itemDiscPct / 100)).toFixed(2));
                    lineNet = Number((lineGrossAmt - lineDiscount).toFixed(2));

                    if (receivedQty === 0 && expected > 0) {
                        lineGrossAmt = unitPrice * expected;
                        lineDiscount = Number((lineGrossAmt * (itemDiscPct / 100)).toFixed(2));
                        lineNet = Number((lineGrossAmt - lineDiscount).toFixed(2));
                    }
                } else {
                    unitPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price) || 0;
                    lineGrossAmt = unitPrice * (receivedQty || (expected > 0 ? expected : 0));
                    lineDiscount = Number((lineGrossAmt * (itemDiscPct / 100)).toFixed(2));
                    lineNet = Number((lineGrossAmt - lineDiscount).toFixed(2));
                }

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

            const lr = latestReceiptInfo(porRows);
            const rs = buildReceiptSummary(porRows);
            const allPosted = rs.receiptsCount > 0 && rs.unpostedReceiptsCount === 0;
            const isClosed = fully && allPosted;
            const fullyReceived = fully && !allPosted;

            const branchName = branchesLabelFromLines(lines, branchesMap);

            const hasUnposted = unpostedRows.length > 0;

            let detailGross = 0;
            let detailDisc = 0;
            let detailVat = 0;
            let detailWht = 0;
            let detailTotal = 0;

            if (isPoFrozen && !hasUnposted) {
                // Completely posted or closed
                detailGross = toNum(po?.gross_amount);
                detailDisc = toNum(po?.discounted_amount);
                detailVat = toNum(po?.vat_amount);
                detailWht = toNum(po?.withholding_tax_amount);
                detailTotal = toNum(po?.total_amount); 
            } else if (isPoFrozen && hasUnposted) {
                // Partially posted, mix of unposted/posted: we still sum what's in DB for unposted if no changes happen, 
                // but if we are frozen, we should just read from the PO header, unless it's out of sync
                detailGross = toNum(po?.gross_amount);
                detailDisc = toNum(po?.discounted_amount);
                detailVat = toNum(po?.vat_amount);
                detailWht = toNum(po?.withholding_tax_amount);
                detailTotal = toNum(po?.total_amount); 
            } else {
                // Live unposted PO: build footer from exact items
                const poIsInvoice = (toNum(po?.receiving_type) === 2) || (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);
                
                for (const arr of itemsByBranch.values()) {
                    for (const item of arr) {
                        if (item.receivedQty > 0) {
                            // The properties on `item` were calculated using receivedQty exactly when receivedQty > 0
                            detailGross += item.grossAmount;
                            detailDisc += item.discountAmount;
                            
                            if (poIsInvoice) {
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
        // inventory_status → 13 (PARTIAL_POSTED) if not fully received after this post.
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
                .filter((x) => x.porId && !x.posted && x.canPost);

            if (!toPost.length) {
                return ok({ ok: true, postedAt: nowISO(), receiptNo, message: "Nothing to post." });
            }

            // --- Persist Live Exact Values for Post ---
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=supplier_name,discount_type.*,discount_type.line_per_discount_type.line_id.*,receiving_type,vat_amount,withholding_tax_amount`;
            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data;
            const sid = toNum(po?.supplier_name);
            const poIsInvoice = (toNum(po?.receiving_type) === 2) || (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            // PO Global Discount
            const poDType = po?.discount_type as any;
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
            const linkDt = link.discount_type as any;
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

                const unitPrice = toNum(p?.cost_per_unit) || toNum(ln?.unit_price);
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
                    isPosted: 1,
                    unit_price: unitPrice,
                    total_amount: lineNet,
                    discounted_amount: lineDisc,
                    discount_type: discountTypeId || null,
                    vat_amount: rowVat,
                    withholding_amount: rowWht,
                });
            }

            // Re-check fully received AFTER posting these rows
            const updatedPorRows = porRows.map((r) => {
                const wasPosted = toPost.find((p) => p.porId === toNum(r?.purchase_order_product_id));
                return wasPosted ? { ...r, isPosted: 1 } : r;
            });
            const fully = isFullyReceived(poId, lines, updatedPorRows);
            
            try {
                const poUpdate: Record<string, unknown> = { date_received: nowISO() };
                if (fully) {
                    // If fully received and all posted, we keep status 6 (Received)
                    // The front-end will know it is "Closed" if unpostedReceiptsCount === 0
                    poUpdate.inventory_status = 6;
                } else {
                    // Not fully received — mark as Partially Received
                    poUpdate.inventory_status = 9;
                }
                await patchPO(base, poId, poUpdate);
            } catch {}

            return ok({
                ok: true,
                postedAt: nowISO(),
                receiptNo,
                fullyPosted: fully,
                // Let the UI know this was a partial post so it can show the right message
                partialPost: !fully,
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

            const poUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=purchase_order_id,purchase_order_no,supplier_name,inventory_status,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
            const pj_po = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj_po?.data ?? null;
            if (!po) return bad("PO not found for bulk posting.", 404);

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


            // Post ALL currently unposted POR rows
            const toPost = porRows
                .filter((r) => toNum(r?.isPosted) === 0 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)));

            if (toPost.length > 0) {
                const sid = toNum(po?.supplier_name);
                const psl = sid ? await fetchProductSupplierLinks(base, sid) : new Map();
                const poDType = po?.discount_type as any;
                const poDiscPct = resolveDiscountPercent(poDType);
                const productIds = Array.from(new Set(toPost.map(r => toNum(r.product_id)).filter(Boolean)));
                const productsMap = await fetchProductsMap(base, productIds);

                for (const r of toPost) {
                    const porId = toNum(r.purchase_order_product_id);
                    if (!porId) continue;

                    const pid = toNum(r.product_id);
                    const p = productsMap.get(pid);
                    const qty = effectiveReceivedQty(r);
                    const uPrice = toNum(p?.cost_per_unit) || toNum(r.unit_price);
                    
                    const link = psl.get(pid);
                    let discPct = 0;
                    let discTypeId = null;

                    if (link) {
                        const linkDt = link.discount_type as any;
                        discPct = resolveDiscountPercent(linkDt);
                        discTypeId = linkDt?.id || linkDt;
                    } else if (poDiscPct > 0) {
                        discPct = poDiscPct;
                        discTypeId = poDType?.id || poDType;
                    }

                    const lineGross = uPrice * qty;
                    const lineDisc = Number((lineGross * (discPct / 100)).toFixed(2));
                    const lineNet = Number((lineGross - lineDisc).toFixed(2));

                    await patchPOR(base, porId, { 
                        isPosted: 1,
                        unit_price: uPrice,
                        total_amount: lineNet,
                        discounted_amount: lineDisc,
                        discount_type: discTypeId || null,
                    });
                }
            }

            const fully = isFullyReceived(poId, lines, porRows);
            try {
                const poUpdate: Record<string, unknown> = { date_received: nowISO() };
                if (fully) {
                    // Keep at status 6 (Received)
                    poUpdate.inventory_status = 6;
                } else {
                    // Partial post: keep at 9 (Partially Received)
                    poUpdate.inventory_status = 9;
                }
                await patchPO(base, poId, poUpdate);
            } catch {}

            return ok({
                ok: true,
                postedAt: nowISO(),
                fullyPosted: fully,
                partialPost: !fully,
                postedCount: toPost.length,
            });
        }


        // -------------------------
        // revert_receipt — revert a single unposted receipt back to receiving.
        // Only the POR rows for the specified receiptNo are affected.
        // Already-posted receipts and other unposted receipts are NOT touched.
        // -------------------------
        if (action === "revert_receipt") {
            const poId = toNum(body?.poId);
            const receiptNo = toStr(body?.receiptNo);
            if (!poId) return bad("Missing poId.", 400);
            if (!receiptNo) return bad("Missing receiptNo.", 400);

            // 1. Fetch all POR rows for this PO
            const porRows = await fetchPORByPOIds(base, [poId]);

            // 2. Identify the rows matching the target receiptNo
            const targetRows = porRows.filter(
                (r) => toStr(r?.receipt_no) === receiptNo
            );
            if (!targetRows.length) {
                return bad("Receipt not found for this PO.", 404);
            }

            // 3. Safety: block reverting already-posted receipts
            const anyPosted = targetRows.some((r) => toNum(r?.isPosted) === 1);
            if (anyPosted) {
                return bad(
                    "Cannot revert a receipt that has already been posted. Only unposted receipts can be reverted.",
                    409
                );
            }

            // 4. Reset each target POR row: clear quantities, financials, and receipt metadata
            const targetPorIds: number[] = [];
            for (const r of targetRows) {
                const porId = toNum(r?.purchase_order_product_id);
                if (!porId) continue;
                targetPorIds.push(porId);

                await patchPOR(base, porId, {
                    received_quantity: 0,
                    receipt_no: null,
                    receipt_date: null,
                    received_date: null,
                    discounted_amount: 0,
                    vat_amount: 0,
                    withholding_amount: 0,
                    total_amount: 0,
                });
            }

            // 4.5. Delete associated RFID tags (both new POR and legacy POP linkages)
            const lines = await fetchPOProductsByPOId(base, poId);
            
            const targetPopIds: number[] = [];
            for (const r of targetRows) {
                const pop = lines.find(ln => toNum(ln.product_id) === toNum(r.product_id) && toNum(ln.branch_id) === toNum(r.branch_id));
                const popId = toNum(pop?.purchase_order_product_id);
                if (popId) targetPopIds.push(popId);
            }

            const allLinkIds = [...targetPorIds, ...targetPopIds];

            if (allLinkIds.length > 0) {
                try {
                    const linkedItems = await fetchReceivingItems(base, allLinkIds);
                    const itemIdsToDelete = linkedItems.map(it => toNum(it.receiving_item_id)).filter(id => id > 0);
                    if (itemIdsToDelete.length > 0) {
                        const deleteUrl = `${base}/items/${POR_ITEMS_COLLECTION}`;
                        await fetch(deleteUrl, {
                            method: "DELETE",
                            headers: directusHeaders(),
                            body: JSON.stringify(itemIdsToDelete),
                        });
                    }
                } catch (err) {
                    console.error("Failed to delete RFID tags during receipt revert:", err);
                }
            }

            // 5. Re-evaluate PO status based on remaining activity
            const updatedPorRows = await fetchPORByPOIds(base, [poId]);

            const hasAnyRemainingReceipts = updatedPorRows.some(
                (r) => toStr(r?.receipt_no) || effectiveReceivedQty(r) > 0
            );
            const hasAnyPosted = updatedPorRows.some(
                (r) => toNum(r?.isPosted) === 1
            );

            // Determine next status:
            // - If posted receipts exist but PO not fully received -> 9 (Partially Received)
            // - If any unposted receipts with activity remain -> 9 (Partially Received)
            // - If no activity at all remains -> 3 (Approved / For Receiving)
            let nextStatus: number;
            if (hasAnyPosted || hasAnyRemainingReceipts) {
                nextStatus = 9; // Partially Received
            } else {
                nextStatus = 3; // Approved / For Receiving
            }

            const poUpdate: Record<string, unknown> = {
                inventory_status: nextStatus,
            };
            // Clear date_received only if nothing remains
            if (!hasAnyRemainingReceipts && !hasAnyPosted) {
                poUpdate.date_received = null;
            }

            try {
                await patchPO(base, poId, poUpdate);
            } catch {}

            return ok({
                ok: true,
                revertedAt: nowISO(),
                receiptNo,
                revertedCount: targetRows.length,
                newStatus: nextStatus,
                noRemainingReceipts: !hasAnyRemainingReceipts && !hasAnyPosted,
            });
        }

        return bad("Unknown action.", 400);
    } catch (e: unknown) {
        const err = e as Error;
        return bad(String(err?.message ?? e ?? "Failed request"), 500);
    }
}