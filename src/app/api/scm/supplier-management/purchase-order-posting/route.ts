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
        return calculateDiscountFromLines(lines as Record<string, unknown>[]);
    }
    if (totalPct > 0) {
        return totalPct;
    }
    return deriveDiscountPercentFromCode(name);
}

async function fetchDiscountTypesMap(base: string) {
    const map = new Map<number, { name: string; pct: number }>();
    try {
        const fields = encodeURIComponent("id,discount_type,total_percent,line_per_discount_type.line_id.*");
        const url = `${base}/items/discount_type?limit=-1&fields=${fields}`;
        const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
        for (const dt of (j?.data ?? [])) {
            const id = toNum(dt.id);
            if (!id) continue;
            map.set(id, { name: toStr(dt.discount_type), pct: resolveDiscountPercent(dt) });
        }
    } catch (e: unknown) {
        console.error("[posting-po] Failed to fetch discount types:", e);
    }
    return map;
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
    is_posted_amounts?: number | string | null;
    discounted_amount: number | string;
    vat_amount: number | string;
    withholding_amount: number | string;
    unit_price: number | string;
    total_amount: number | string;
    discount_type?: number | string | null;
    is_reverted?: number | string | null;
}


const POR_SAFE_FIELDS =
    "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,is_reverted,discounted_amount,vat_amount,withholding_amount,total_amount,unit_price,discount_type";

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
        `&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount,received,discount_type.*`;
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
            `&fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted`;
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



async function patchPO(base: string, poId: number, payload: unknown) {
    const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) }).catch(() => {});
}

async function patchPOR(base: string, porId: number, payload: unknown) {
    const url = `${base}/items/${POR_COLLECTION}/${encodeURIComponent(String(porId))}`;
    await fetchJson(url, { method: "PATCH", body: JSON.stringify(payload) });
}



// =====================
// BUILDERS / LOGIC
// =====================
function productDisplayCode(p: Product | null, productId: number) {
    return toStr(p?.barcode) || toStr(p?.product_code) || String(productId);
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
    grossAmount: number;
    discountAmount: number;
    vatAmount: number;
    withholdingTaxAmount: number;
    totalAmount: number;
};

function buildReceiptSummary(porRows: PORRow[]) {
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

        // STRATEGY 1: POR rows with receipt/received activity that are not yet posted
        const porCandidateUrl =
            `${base}/items/${POR_COLLECTION}?limit=-1` +
            `&filter[isPosted][_eq]=0` +
            `&filter[is_reverted][_neq]=1` +
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



        // Supplier names
        const supplierIds = poHeaders.map((p) => toNum(p?.supplier_name)).filter(Boolean);
        const supplierNamesMap = await fetchSupplierNames(base, supplierIds);
        
        const allProductIds = Array.from(new Set(Array.from(linesByPo.values()).flatMap(rows => rows.map(r => toNum(r.product_id)).filter(Boolean))));
        await fetchProductsMap(base, allProductIds as number[]);

        const list: PostingListItem[] = [];

        for (const po of poHeaders) {
            const poId = toNum(po?.purchase_order_id);
            if (!poId) continue;

            // Skip fully-closed POs (inventory_status=14) or already financially posted POs
            const invStatus = toNum(po?.inventory_status);
            if (invStatus === 14) continue;
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) continue;

            const porRows = porByPo.get(poId) ?? [];
            const lines = linesByPo.get(poId) ?? [];

            // ✅ HARDENED: Status 12 (Transit/En Route) is NOT eligible for posting.
            // A PO must be physically received (status 6, 9, or 13) before it can be posted.
            const eligibleByStatus = invStatus === 6 || invStatus === 9 || invStatus === 13;
            
            // ✅ Also check if there are unposted POR rows with ACTUAL receipt activity
            // (must have receipt_no AND received_quantity > 0 to count as real receipt activity)
            const hasUnpostedReceipts = porRows.some((r) => 
                toNum(r?.isPosted) === 0 &&
                toStr(r?.receipt_no) &&
                toNum(r?.received_quantity) > 0
            );
            
            // Show PO only if it has an eligible receiving status OR has genuine unposted receipts
            if (!eligibleByStatus && !hasUnpostedReceipts) continue;

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

            // Align totalAmount with what's actually being posted
            const unpostedRows = porRows.filter(r => toNum(r.isPosted) === 0 && (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)) && toNum(r.is_reverted) !== 1);
            let listTotal = 0;
            if (unpostedRows.length > 0) {
                // Inventory module trusts stored values in POR for listTotal
                for (const r of unpostedRows) {
                    listTotal += toNum(r.total_amount);
                }
            } else {
                listTotal = Number((toNum(po?.total_amount) - toNum(po?.discounted_amount)).toFixed(2));
            }

            const itemsInReceipts = new Set<number>();
            for (const r of unpostedRows) {
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
                    hasAnyPosted,
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
                `?fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,total_amount,date_received,inventory_status,gross_amount,discounted_amount,vat_amount,withholding_tax_amount,discount_type.*,discount_type.line_per_discount_type.line_id.*,price_type`;

            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data ?? null;
            if (!po) return bad("PO not found.", 404);

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);

            // ✅ Block if PO is already financially posted (locked by Post Amounts)
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            // ✅ HARDENED: Check for actual receipt activity (must have receipt_no AND received_quantity > 0)
            const hasAnyRealReceipts = porRows.some(r => toNum(r.received_quantity) > 0 && toStr(r.receipt_no));
            const hasAnyPosted = porRows.some((r) => toNum(r?.isPosted) === 1);
            const invStatus = toNum(po?.inventory_status);

            if (!hasAnyRealReceipts && !hasAnyPosted && invStatus !== 13) {
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
            const discountTypesMap = await fetchDiscountTypesMap(base);
            // Removed: Live Sourcing of productSupplierLinks is no longer done here.
            // The Inventory module trusts the financials saved by the Amounts module.

            // ── Resolve PO-level discount percent (Total Percent Source of Truth) ──

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
            porRows.forEach(r => {
                if (toNum(r.received_quantity) > 0 || toStr(r.receipt_no)) {
                    allKeys.add(`${toNum(r.product_id)}-${toNum(r.branch_id)}`);
                }
            });

            for (const keyStr of allKeys) {
                const [pid, bid] = keyStr.split("-").map(Number);
                if (!pid || !bid) continue;

                const ln = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                const expected = Math.max(0, toNum(ln?.ordered_quantity || 0));

                const k = keyLine(poId, pid, bid);
                const porIdsForLine = porIdsByKey.get(k) ?? [];

                const p = productsMap.get(pid) ?? null;
                const linePorRowsAll = porRows.filter(r => porIdsForLine.includes(toNum(r.purchase_order_product_id)));

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

                let emittedRows = 0;

                for (const [receiptNo, receiptRows] of Array.from(rowsByReceipt.entries())) {
                    const receivedQty = receiptRows.reduce((sum, r) => sum + effectiveReceivedQty(r), 0);
                    // Only skip if there's no receiptNo AND quantity is 0 (prevents emitting empty pending rows when not needed)
                    // If it has a receiptNo but qty is 0, we still show it because it's part of the receipt's history (e.g., reverted).
                    if (!receiptNo && receivedQty === 0) continue; 

                    const rfids: string[] = [];
                    
                    const srcRow = receiptRows.find(r => toNum(r.unit_price) > 0) || receiptRows.find(r => toNum(r.isPosted) === 1) || receiptRows[0];
                    let discountTypeId = "";
                    let resolvedLabel = "—";
                    if (srcRow) {
                        const rawDt = srcRow.discount_type;
                        const dtId = rawDt 
                            ? (typeof rawDt === "object" && rawDt !== null && "id" in rawDt 
                                ? toNum((rawDt as { id: unknown }).id) 
                                : toNum(rawDt)) 
                            : 0;
                        if (dtId > 0) {
                            const dt = discountTypesMap.get(dtId);
                            resolvedLabel = toStr(dt?.name, "—");
                            discountTypeId = String(dtId);
                        }
                    }

                    const unitPrice = toNum(srcRow?.unit_price) || toNum(ln?.unit_price) || toNum(p?.cost_per_unit);
                    const lineGrossAmt = receiptRows.reduce((sum, r) => sum + (toNum(r.unit_price) * effectiveReceivedQty(r)), 0);
                    const lineDiscount = receiptRows.reduce((sum, r) => sum + toNum(r.discounted_amount), 0);
                    const lineNet = receiptRows.reduce((sum, r) => sum + toNum(r.total_amount), 0);

                    const primaryPorId = toNum(receiptRows[0]?.purchase_order_product_id);

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
                        grossAmount: lineGrossAmt,
                        discountAmount: lineDiscount,
                        netAmount: lineNet,
                        discountTypeId: discountTypeId || undefined,
                        discountLabel: resolvedLabel !== "—" ? resolvedLabel : undefined,
                        receiptNo: receiptNo || undefined,
                        receiptDate: toStr(receiptRows[0]?.receipt_date) || toStr(receiptRows[0]?.received_date) || undefined,
                    };

                    const arr = itemsByBranch.get(bid) ?? [];
                    arr.push(item);
                    itemsByBranch.set(bid, arr);
                    emittedRows++;
                }

                // If nothing emitted, it means no receiving activity at all for this expected product.
                // We emit a pending row so it shows up in status/allocations as pending.
                if (emittedRows === 0) {
                    const unitPrice = toNum(ln?.unit_price) || toNum(p?.cost_per_unit);
                    const lineGrossAmt = unitPrice * expected;
                    const lineNet = lineGrossAmt;

                    const item: PostingPOItem = {
                        id: String(porIdsForLine[0] || `pending-${pid}-${bid}`),
                        porId: String(porIdsForLine[0] || `pending-${pid}-${bid}`),
                        productId: String(pid),
                        name: toStr(p?.product_name, `Product #${pid}`),
                        barcode: productDisplayCode(p, pid),
                        uom: "—",
                        expectedQty: expected,
                        taggedQty: 0,
                        receivedQty: 0,
                        rfids: [],
                        isReceived: false,
                        unitPrice,
                        grossAmount: lineGrossAmt,
                        discountAmount: 0,
                        netAmount: lineNet,
                    };

                    const arr = itemsByBranch.get(bid) ?? [];
                    arr.push(item);
                    itemsByBranch.set(bid, arr);
                }
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
            const allInvPosted = porRows.length > 0 && porRows.every(r => toNum(r.isPosted) === 1);
            const allAmtPosted = porRows.length > 0 && porRows.every(r => toNum(r.is_posted_amounts) === 1);
            const allLinesReceived = lines.length > 0 && lines.every(l => toNum(l.received) === 1);
            const isClosed = fully && allInvPosted && allAmtPosted && allLinesReceived;
            const fullyReceived = fully && !isClosed;

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
                const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);
                
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
                    hasAnyPosted,
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

            // ✅ Check is_posted lock
            const poCheckUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=is_posted`;
            const poCheckJ = await fetchJson(poCheckUrl) as { data: Record<string, unknown> };
            if (toNum(poCheckJ?.data?.is_posted) === 1 || poCheckJ?.data?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

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
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=supplier_name,discount_type.*,discount_type.line_per_discount_type.line_id.*,vat_amount,withholding_tax_amount`;
            const pj = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj?.data;

            // PO Global Discount
            const poDType = po?.discount_type as Record<string, unknown> | null | undefined;
            resolveDiscountPercent(poDType);

            for (const row of toPost) {
                await patchPOR(base, row.porId, { 
                    isPosted: 1,
                });
            }

            // Re-check fully received AFTER posting these rows
            const updatedPorRows = porRows.map((r) => {
                const wasPosted = toPost.find((p) => p.porId === toNum(r?.purchase_order_product_id));
                return wasPosted ? { ...r, isPosted: 1 } : r;
            });

            // Sync 'received' flag in POP based on POSTED quantities
            const updatedPorIdsByKey = buildPorIdsByKey(updatedPorRows);
            const popSyncPromises = lines.map(async (ln) => {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                const pors = updatedPorIdsByKey.get(k) || [];
                
                const totalPosted = pors.reduce((sum, id) => {
                    const row = updatedPorRows.find(r => toNum(r.purchase_order_product_id) === id && toNum(r.isPosted) === 1);
                    return sum + (row ? toNum(row.received_quantity) : 0);
                }, 0);
                
                const ordered = toNum(ln.ordered_quantity);
                const shouldBeReceived = (totalPosted >= ordered && totalPosted > 0) || (ordered === 0 && totalPosted > 0);
                const currentReceived = toNum(ln.received || 0);

                if (shouldBeReceived && currentReceived !== 1) {
                    await fetchJson(`${base}/items/${PO_PRODUCTS_COLLECTION}/${ln.purchase_order_product_id}`, {
                        method: "PATCH", body: JSON.stringify({ received: 1 })
                    }).catch(() => {});
                } else if (!shouldBeReceived && currentReceived === 1) {
                    await fetchJson(`${base}/items/${PO_PRODUCTS_COLLECTION}/${ln.purchase_order_product_id}`, {
                        method: "PATCH", body: JSON.stringify({ received: 0 })
                    }).catch(() => {});
                }
            });
            await Promise.all(popSyncPromises);

            const fully = isFullyReceived(poId, lines, updatedPorRows);
            try {
                const poUpdate: Record<string, unknown> = { date_received: nowISO() };
                const amountsPosted = toNum(poCheckJ?.data?.is_posted) === 1 || poCheckJ?.data?.is_posted === true;
                if (fully) {
                    const allInvPosted = updatedPorRows.every(r => toNum(r.isPosted) === 1);
                    const allAmtPosted = updatedPorRows.every(r => toNum(r.is_posted_amounts) === 1);
                    const updatedPorIdsByKey = buildPorIdsByKey(updatedPorRows);
                    const allLinesReceived = lines.every(ln => {
                        const pid = toNum(ln.product_id);
                        const bid = toNum(ln.branch_id ?? 0);
                        const k = keyLine(poId, pid, bid);
                        const pors = updatedPorIdsByKey.get(k) || [];
                        const totalPosted = pors.reduce((sum, id) => {
                            const row = updatedPorRows.find(r => toNum(r.purchase_order_product_id) === id && toNum(r.isPosted) === 1);
                            return sum + (row ? toNum(row.received_quantity) : 0);
                        }, 0);
                        const ordered = toNum(ln.ordered_quantity);
                        return (totalPosted >= ordered && totalPosted > 0) || (ordered === 0 && totalPosted > 0);
                    });

                    const hasUnpostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 0 && toStr(r.receipt_no));
                    const hasAnyPostedReceipts = updatedPorRows.some(r => toNum(r.isPosted) === 1);

                    if (allInvPosted && allAmtPosted && amountsPosted && allLinesReceived) {
                        poUpdate.inventory_status = 6; // Received
                    } else if (hasAnyPostedReceipts) {
                        poUpdate.inventory_status = 9; // Partially Received
                    } else if (hasUnpostedReceipts) {
                        poUpdate.inventory_status = 13; // For Posting
                    } else {
                        poUpdate.inventory_status = 3; // For Receiving
                    }
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

            const poUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=purchase_order_id,purchase_order_no,supplier_name,inventory_status,discount_type.*,discount_type.line_per_discount_type.line_id.*,is_posted`;
            const pj_po = await fetchJson(poUrl) as { data: Record<string, unknown> };
            const po = pj_po?.data ?? null;
            if (!po) return bad("PO not found for bulk posting.", 404);

            // ✅ Check is_posted lock
            if (toNum(po?.is_posted) === 1 || po?.is_posted === true) {
                return bad("This PO has been fully posted and is now locked. No further changes allowed.", 409);
            }

            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);



            // ✅ HARDENED: Require actual receipt activity before allowing posting
            const hasAnyReceivedQty = porRows.some(
                (r) => effectiveReceivedQty(r) > 0 && toStr(r?.receipt_no)
            );
            const hasAnyPosted = porRows.some((r) => toNum(r?.isPosted) === 1);

            if (!hasAnyReceivedQty && !hasAnyPosted) {
                return bad("Cannot post. Please receive items in Receiving Products first.", 409);
            }

            // Post ALL currently unposted POR rows that have actual received quantities
            const toPost = porRows
                .filter((r) => toNum(r?.isPosted) === 0 && toNum(r.received_quantity) > 0 && toStr(r.receipt_no));

            // ✅ HARDENED: Block if no rows qualify for posting
            if (toPost.length === 0 && !hasAnyPosted) {
                return bad("Nothing to post. No receipts with received quantities found. Please complete receiving first.", 409);
            }

            let fully = isFullyReceived(poId, lines, porRows);
            if (toPost.length > 0) {
            const successfulPorIds: number[] = [];
            try {
                    // 1. Post receipts
                    for (const r of toPost) {
                        const porId = toNum(r.purchase_order_product_id);
                        if (!porId) continue;
                        await patchPOR(base, porId, { isPosted: 1 });
                        successfulPorIds.push(porId);
                    }

                    // 2. Fetch updated state
                    const updatedPorRowsAll = await fetchPORByPOIds(base, [poId]);
                    fully = isFullyReceived(poId, lines, updatedPorRowsAll);

                    // 3. Update PO Header
                    const poUpdate: Record<string, unknown> = { date_received: nowISO() };
                    const amountsPosted = toNum(po?.is_posted) === 1 || po?.is_posted === true;

                    if (fully) {
                        const allInvPosted = updatedPorRowsAll.every(r => toNum(r.isPosted) === 1);
                        const allAmtPosted = updatedPorRowsAll.every(r => toNum(r.is_posted_amounts) === 1);
                        const updatedPorIdsByKeyAll = buildPorIdsByKey(updatedPorRowsAll);
                        const allLinesReceived = lines.every(ln => {
                            const pid = toNum(ln.product_id);
                            const bid = toNum(ln.branch_id ?? 0);
                            const k = keyLine(poId, pid, bid);
                            const pors = updatedPorIdsByKeyAll.get(k) || [];
                            const totalPosted = pors.reduce((sum, id) => {
                                const row = updatedPorRowsAll.find(r => toNum(r.purchase_order_product_id) === id && toNum(r.isPosted) === 1);
                                return sum + (row ? toNum(row.received_quantity) : 0);
                            }, 0);
                            const ordered = toNum(ln.ordered_quantity);
                            return (totalPosted >= ordered && totalPosted > 0) || (ordered === 0 && totalPosted > 0);
                        });

                        const hasUnpostedReceipts = updatedPorRowsAll.some(r => toNum(r.isPosted) === 0 && toStr(r.receipt_no));
                        const hasAnyPostedReceipts = updatedPorRowsAll.some(r => toNum(r.isPosted) === 1);

                        if (allInvPosted && allAmtPosted && amountsPosted && allLinesReceived) {
                            poUpdate.inventory_status = 6; // Fully Received & Fully Posted
                        } else if (hasAnyPostedReceipts) {
                            poUpdate.inventory_status = 9; // Partially Received
                        } else if (hasUnpostedReceipts) {
                            poUpdate.inventory_status = 13; // For Posting
                        } else {
                            poUpdate.inventory_status = 3; // For Receiving
                        }
                    } else {
                        const hasUnpostedReceipts = updatedPorRowsAll.some(r => toNum(r.isPosted) === 0 && toStr(r.receipt_no));
                        const hasAnyPostedReceipts = updatedPorRowsAll.some(r => toNum(r.isPosted) === 1);

                        if (hasAnyPostedReceipts) {
                            poUpdate.inventory_status = 9; // Partially Received
                        } else if (hasUnpostedReceipts) {
                            poUpdate.inventory_status = 13; // For Posting
                        } else {
                            poUpdate.inventory_status = 3; // For Receiving
                        }
                    }
                    await patchPO(base, poId, poUpdate);

                    // 4. Update PO Products Sync
                    const updatedPorIdsByKeyAll = buildPorIdsByKey(updatedPorRowsAll);
                    const popSyncPromisesAll = lines.map(async (ln) => {
                        const pid = toNum(ln.product_id);
                        const bid = toNum(ln.branch_id ?? 0);
                        const k = keyLine(poId, pid, bid);
                        const pors = updatedPorIdsByKeyAll.get(k) || [];
                        
                        const totalPosted = pors.reduce((sum, id) => {
                            const row = updatedPorRowsAll.find(r => toNum(r.purchase_order_product_id) === id && toNum(r.isPosted) === 1);
                            return sum + (row ? toNum(row.received_quantity) : 0);
                        }, 0);
                        
                        const ordered = toNum(ln.ordered_quantity);
                        const shouldBeReceived = (totalPosted >= ordered && totalPosted > 0) || (ordered === 0 && totalPosted > 0);
                        const currentReceived = toNum(ln.received || 0);

                        if (shouldBeReceived && currentReceived !== 1) {
                            await fetchJson(`${base}/items/${PO_PRODUCTS_COLLECTION}/${ln.purchase_order_product_id}`, {
                                method: "PATCH", body: JSON.stringify({ received: 1 })
                            });
                        } else if (!shouldBeReceived && currentReceived === 1) {
                            await fetchJson(`${base}/items/${PO_PRODUCTS_COLLECTION}/${ln.purchase_order_product_id}`, {
                                method: "PATCH", body: JSON.stringify({ received: 0 })
                            });
                        }
                    });
                    await Promise.all(popSyncPromisesAll);

                } catch (err) {
                    console.error("Post Inventory failed, initiating rollback...", err);
                    // Rollback all successful posts in this session
                    for (const porId of successfulPorIds) {
                        await patchPOR(base, porId, { isPosted: 0 }).catch(e => console.error(`Rollback failed for POR ${porId}:`, e));
                    }
                    return bad(`Failed to post inventory: ${(err as Error).message}. Changes rolled back.`, 500);
                }
            }

            return ok({
                ok: true,
                postedAt: nowISO(),
                fullyPosted: fully,
                partialPost: !fully,
                postedCount: toPost.length,
            });
        }


        // -------------------------
        // revert_receipt — NON-DESTRUCTIVE "Draft Transformation" revert.
        // Clears only the receipt_no and receipt_date to hide the receipt from
        // Post Inventory, while preserving all item data (quantities, batches,
        // expiry, financials, RFID tags) in the database.
        // The PO status is rolled back to 9 (Partially Received) so the PO
        // reappears in the Receiving Manual module with all data pre-filled.
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

            // 4. REVERT FLAG: Set is_reverted=1 to mark this receipt as reverted.
            //    Everything else is PRESERVED:
            //    - receipt_no, receipt_date → KEPT (for identification in Receiving Manual)
            //    - received_quantity → KEPT (for data restoration in Edit Mode)
            //    - batch_no, expiry_date, lot_id → KEPT
            //    - discounted_amount, vat_amount, withholding_amount, total_amount → KEPT
            //    - RFID tags (purchase_order_receiving_items) → KEPT
            for (const r of targetRows) {
                const porId = toNum(r?.purchase_order_product_id);
                if (!porId) continue;
                await patchPOR(base, porId, {
                    is_reverted: 1,
                });
            }

            const lines = await fetchPOProductsByPOId(base, poId);

            // 5. Set PO status to 9 (Partially Received) so it appears in Receiving
            //    (Receiving filters: inventory_status IN 3, 9, 11, 12)
            const nextStatus = 9;

            const poUpdate: Record<string, unknown> = {
                inventory_status: nextStatus,
            };

            await patchPO(base, poId, poUpdate);

            // 6. Update 'received' flag in purchase_order_products
            //    Re-evaluate based on POSTED receipts only (the reverted ones are now drafts)
            const updatedPorIdsByKeyRevert = buildPorIdsByKey(porRows);
            const popSyncPromisesRevert = lines.map(async (ln) => {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                const pors = updatedPorIdsByKeyRevert.get(k) || [];
                
                const totalPosted = pors.reduce((sum, id) => {
                    const row = porRows.find(r => toNum(r.purchase_order_product_id) === id && toNum(r.isPosted) === 1);
                    return sum + (row ? toNum(row.received_quantity) : 0);
                }, 0);
                
                const ordered = toNum(ln.ordered_quantity);
                const shouldBeReceived = (totalPosted >= ordered && totalPosted > 0) || (ordered === 0 && totalPosted > 0);
                const currentReceived = toNum(ln.received || 0);

                if (!shouldBeReceived && currentReceived === 1) {
                    await fetchJson(`${base}/items/${PO_PRODUCTS_COLLECTION}/${ln.purchase_order_product_id}`, {
                        method: "PATCH", body: JSON.stringify({ received: 0 })
                    }).catch(() => {});
                }
            });
            await Promise.all(popSyncPromisesRevert);

            return ok({
                ok: true,
                revertedAt: nowISO(),
                receiptNo,
                revertedCount: targetRows.length,
                newStatus: nextStatus,
                noRemainingReceipts: false,
            });
        }

        return bad("Unknown action.", 400);
    } catch (e: unknown) {
        const err = e as Error;
        return bad(String(err?.message ?? e ?? "Failed request"), 500);
    }
}