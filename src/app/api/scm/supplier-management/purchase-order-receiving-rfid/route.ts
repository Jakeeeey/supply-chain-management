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
    const s = String(v ?? "").trim();
    return s ? s : fb;
}
function toNum(v: unknown) {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function ensureId(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "object") {
        const obj = v as Record<string, unknown>;
        const id = obj?.id ?? obj?.purchase_order_product_id ?? obj?.product_id;
        const n = toNum(id);
        return n > 0 ? n : null;
    }
    const n = toNum(v);
    return n > 0 ? n : null;
}

function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0" || code === "STANDARD") return 0;

    // Improved regex to avoid extracting digits from random codes like "L3" if it's not clearly a %
    // We only extract if it's like "3%", "10 percent", etc.
    const nums = (code.match(/(\d+(?:\.\d+)?)\s*%/g) ?? [])
        .map((s) => Number(s.replace(/%/g, "")))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);

    if (!nums.length) {
        // Fallback: only extract if the code is ONLY digits or like "D5" or "L6"
        if (/^[DL]\d+$/.test(code)) {
            const n = Number(code.replace(/[DL]/, ""));
            if (n > 0 && n <= 100) return n;
        }
        return 0;
    }
    const factor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    const combined = (1 - factor) * 100;
    return Number(combined.toFixed(4));
}
function nowISO() {
    const date = new Date();
    const phOffset = 8 * 60; // 8 hours in minutes
    const localOffset = date.getTimezoneOffset(); // in minutes
    const phTime = new Date(date.getTime() + (phOffset + localOffset) * 60000);
    return phTime.toISOString().replace("Z", "");
}
function keyLine(poId: number, productId: number, branchId: number) {
    return `${poId}::${productId}::${branchId}`;
}
interface DiscountLine {
    id?: string | number;
    description?: string;
    percentage?: string | number;
    line_id?: {
        id?: string | number;
        description?: string;
        percentage?: string | number;
    };
}

function calculateDiscountFromLines(lines: DiscountLine[]): number {
    if (!lines.length) return 0;
    const factor = lines.reduce((acc: number, l: DiscountLine) => acc * (1 - toNum(l.line_id?.percentage ?? l?.percentage) / 100), 1);
    return Number(((1 - factor) * 100).toFixed(4));
}

async function fetchReceiptTypesMap(base: string): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    try {
        const url = `${base}/items/sales_invoice_type?limit=-1&fields=id,shortcut`;
        const j = await fetchJson<{ data: Array<{ id: number; shortcut: string }> }>(url);
        for (const t of (j?.data || [])) {
            if (t.id) map.set(t.id, String(t.shortcut || "").trim());
        }
    } catch (e) {
        console.error("Failed to fetch receipt types map:", e);
    }
    return map;
}

const RFID_LEN = 24;
function normalizeRfid(raw: string): string {
    const up = toStr(raw).toUpperCase();
    const matches = up.match(/[0-9A-F]{24,}/g) ?? [];
    if (matches.length > 0) return (matches[0] ?? "").slice(0, RFID_LEN);
    return up.replace(/[^0-9A-F]/g, "").slice(0, RFID_LEN);
}

const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const BRANCHES_COLLECTION = "branches";
const POR_COLLECTION = "purchase_order_receiving";
const POR_ITEMS_COLLECTION = "purchase_order_receiving_items";
const LOTS_COLLECTION = "lots";
const UNITS_COLLECTION = "units";
const PRODUCT_SUPPLIER_COLLECTION = "product_per_supplier";

type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

type POItem = {
    id: string;
    porId: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    uomCount: number;
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
    isExtra?: boolean;
};



interface POHeaderRow {
    purchase_order_id: string | number;
    purchase_order_no: string;
    date?: string;
    date_encoded?: string;
    approver_id?: string | number;
    date_approved?: string;
    payment_status?: string | number;
    inventory_status?: string | number;
    date_received?: string;
    supplier_name?: string | number;
    total_amount?: string | number;
    price_type?: string;
    discount_percentage?: string | number;
    discount_percent?: string | number;
    discount_type?: {
        id?: string | number;
        discount_type?: string;
        discount_code?: string;
        name?: string;
        total_percent?: string | number;
        line_per_discount_type?: DiscountLine[];
    } | null;
    vat_amount?: string | number;
    withholding_tax_amount?: string | number;
}

interface ProductRow {
    product_id: string | number;
    product_name?: string;
    barcode?: string;
    product_code?: string;
    cost_per_unit?: string | number;
    unit_of_measurement?: {
        unit_id?: string | number;
        unit_name?: string;
        unit_shortcut?: string;
    } | null;
    unit_of_measurement_count?: string | number;
}


async function fetchApprovedNotReceivedPOs(base: string): Promise<POHeaderRow[]> {
    const qs = [
        "limit=-1", "sort=-purchase_order_id",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,approver_id,date_approved,payment_status,inventory_status,date_received,supplier_name,total_amount,price_type",
        "filter[_or][0][inventory_status][_eq]=3", "filter[_or][1][inventory_status][_eq]=9",
        "filter[_or][2][inventory_status][_eq]=11", "filter[_or][3][inventory_status][_eq]=12",
        "filter[_or][4][inventory_status][_eq]=13",
    ].join("&");
    const url = `${base}/items/${PO_COLLECTION}?${qs}`;
    const j = await fetchJson<{ data: POHeaderRow[] }>(url);
    return j?.data ?? [];
}

interface PORow {
    purchase_order_product_id: string | number;
    purchase_order_id: string | number;
    product_id: string | number;
    branch_id: string | number;
    received_quantity?: string | number;
    receipt_no?: string | null;
    receipt_date?: string | null;
    received_date?: string | null;
    isPosted?: string | number;
    is_reverted?: string | number | null;
    lot_id?: string | number;
    batch_no?: string;
    expiry_date?: string;
    unit_price?: string | number;
    discount_type?: string | number | null;
    discounted_amount?: string | number;
    vat_amount?: string | number;
    withholding_amount?: string | number;
    total_amount?: string | number;
    receipt_type?: string | null;
}

interface POProductRow {
    purchase_order_product_id: string | number;
    purchase_order_id: string | number;
    product_id: string | number;
    branch_id?: string | number | null;
    ordered_quantity: string | number;
    unit_price: string | number;
    total_amount?: string | number;
    discount_type?: string | number | null;
}

const POR_SAFE_FIELDS = "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,receipt_type,received_date,isPosted,is_reverted,lot_id,batch_no,expiry_date,discount_type,unit_price,discounted_amount";


async function fetchReceivingItemsByLinkIds(base: string, linkIds: number[]) {
    if (!linkIds.length) return [];
    const out: Record<string, unknown>[] = [];
    for (const ids of chunk(Array.from(new Set(linkIds)).filter(Boolean), 250)) {
        const url = `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code,created_at&filter[purchase_order_product_id][_in]=${encodeURIComponent(ids.join(","))}`;
        const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
        out.push(...(j?.data ?? []));
    }
    return out;
}

async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [];
    const rows: PORow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url = `${base}/items/${POR_COLLECTION}?limit=-1&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}&fields=${encodeURIComponent(POR_SAFE_FIELDS)}`;
        const j = await fetchJson<{ data: PORow[] }>(url);
        rows.push(...(j?.data ?? []));
    }
    return rows;
}


async function fetchPOProductsByPOId(base: string, poId: number) {
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson<{ data: POProductRow[] }>(url);
    return (j?.data ?? []);
}

async function fetchDiscountTypesMap(base: string) {
    const map = new Map<string, { name: string; pct: number }>();
    try {
        const fields = encodeURIComponent("id,discount_type,total_percent,line_per_discount_type.line_id.*");
        const url = `${base}/items/discount_type?limit=-1&fields=${fields}`;
        interface DiscountTypeResponse {
            id: string | number;
            discount_type: string;
            total_percent: string | number;
            line_per_discount_type?: DiscountLine[];
        }
        const j = await fetchJson<{ data: DiscountTypeResponse[] }>(url);
        for (const dt of (j?.data ?? [])) {
            const id = String(dt.id);
            const rawPct = toNum(dt.total_percent);
            const lines = dt.line_per_discount_type ?? [];

            let computed = 0;

            if (rawPct > 0) {
                computed = rawPct;
            } else if (lines.length > 0) {
                computed = calculateDiscountFromLines(lines);
            } else {
                computed = deriveDiscountPercentFromCode(toStr(dt.discount_type));
            }

            map.set(id, { name: toStr(dt.discount_type), pct: computed });
        }
    } catch {
        // ignore
    }
    return map;
}

async function fetchProductSupplierLinks(base: string, productIds: number[], supplierId?: number) {
    const map = new Map<number, { supplier_id: number; discount_type: unknown }>();
    const ids = Array.from(new Set(productIds));
    if (!ids.length) return map;

    try {
        // 1. Fetch direct links
        for (const chunkIds of chunk(ids, 250)) {
            const url = supplierId
                ? `${base}/items/${PRODUCT_SUPPLIER_COLLECTION}?limit=-1&filter[product_id][_in]=${encodeURIComponent(chunkIds.join(","))}&filter[supplier_id][_eq]=${supplierId}&fields=*`
                : `${base}/items/${PRODUCT_SUPPLIER_COLLECTION}?limit=-1&filter[product_id][_in]=${encodeURIComponent(chunkIds.join(","))}&fields=*`;

            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            for (const link of (j?.data ?? [])) {
                const pid = toNum(link?.product_id);
                if (pid) map.set(pid, { supplier_id: toNum(link?.supplier_id), discount_type: link?.discount_type });
            }
        }

        // 2. Family Logic: If some products have no direct link, check their parents/siblings
        const missingIds = ids.filter(id => !map.has(id));
        if (missingIds.length > 0 && supplierId) {
            // Find parents/roots for missing products
            const initialUrl = `${base}/items/products?limit=-1&fields=product_id,parent_id&filter[product_id][_in]=${encodeURIComponent(missingIds.join(","))}`;
            const initialRes = await fetchJson<{ data: Array<{ product_id: number; parent_id?: number }> }>(initialUrl);
            const productMetas = initialRes.data ?? [];
            const rootIds = Array.from(new Set(productMetas.map(p => p.parent_id || p.product_id).filter(Boolean))) as number[];

            if (rootIds.length > 0) {
                // Fetch links for any family member (roots or siblings)
                const familyLinkUrl = `${base}/items/${PRODUCT_SUPPLIER_COLLECTION}?limit=-1&filter[supplier_id][_eq]=${supplierId}&filter[product_id][_in]=${encodeURIComponent(rootIds.join(","))}&fields=product_id,discount_type`;
                const familyLinkRes = await fetchJson<{ data: Array<Record<string, unknown>> }>(familyLinkUrl);
                const familyLinks = familyLinkRes.data ?? [];

                // Map root_id -> discount_type
                const rootDiscountMap = new Map<number, unknown>();
                for (const fl of familyLinks) {
                    const flPid = toNum(fl.product_id);
                    if (rootIds.includes(flPid)) {
                        rootDiscountMap.set(flPid, fl.discount_type);
                    }
                }

                // Apply to missing products
                for (const mid of missingIds) {
                    const meta = productMetas.find(p => p.product_id === mid);
                    if (meta) {
                        const rid = meta.parent_id || meta.product_id;
                        if (rid && rootDiscountMap.has(rid)) {
                            map.set(mid, { supplier_id: supplierId, discount_type: rootDiscountMap.get(rid) });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch product supplier links with family logic:", e);
    }
    return map;
}

async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(supplierIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,supplier_name`;
        const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
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
        const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
        for (const b of (j?.data ?? [])) map.set(toNum(b.id), toStr(b.branch_name) || toStr(b.branch_description) || `Branch ${b.id}`);
    }
    return map;
}

async function fetchProductsMap(base: string, productIds: number[]) {
    const map = new Map<number, ProductRow>();
    const uniq = Array.from(new Set(productIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${PRODUCTS_COLLECTION}?limit=-1&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}&fields=product_id,product_name,barcode,product_code,cost_per_unit,unit_of_measurement.*,unit_of_measurement_count`;
        const j = await fetchJson<{ data: ProductRow[] }>(url);
        for (const p of (j?.data ?? [])) map.set(toNum(p.product_id), p);
    }
    return map;
}

function productDisplayCode(p: ProductRow | undefined, productId: number) {
    const pc = toStr(p?.product_code);
    const bc = toStr(p?.barcode);
    if (pc && bc && pc !== bc) return `${pc} (${bc})`;
    return pc || bc || String(productId);
}

function effectiveReceivedQty(por: PORow | null | undefined) {
    if (toNum(por?.is_reverted) === 1) return 0;
    const posted = toNum(por?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(por?.received_quantity ?? 0));
    const evidence = Boolean(toStr(por?.receipt_no) || toStr(por?.receipt_date) || toStr(por?.received_date));
    if (!evidence) return 0;
    return Math.max(0, toNum(por?.received_quantity ?? 0));
}

function buildPorIdsByKey(porRows: PORow[]) {
    const map = new Map<string, number[]>();
    for (const r of porRows) {
        const k = keyLine(toNum(r.purchase_order_id), toNum(r.product_id), toNum(r.branch_id));
        const arr = map.get(k) ?? [];
        arr.push(toNum(r.purchase_order_product_id));
        map.set(k, arr);
    }
    return map;
}

function buildTagMapsForScopes(args: { poLines: POProductRow[], porRows: PORow[], receivingItems: Record<string, unknown>[] }) {
    const linkToKey = new Map<number, string>();
    for (const r of args.porRows) linkToKey.set(toNum(r.purchase_order_product_id), keyLine(toNum(r.purchase_order_id), toNum(r.product_id), toNum(r.branch_id)));
    for (const ln of args.poLines) linkToKey.set(toNum(ln.purchase_order_product_id), keyLine(toNum(ln.purchase_order_id), toNum(ln.product_id), toNum(ln.branch_id ?? 0)));

    const rfidsByKey = new Map<string, string[]>();
    for (const it of args.receivingItems) {
        const k = linkToKey.get(toNum(it.purchase_order_product_id));
        if (!k) continue;
        const arr = rfidsByKey.get(k) ?? [];
        arr.push(toStr(it.rfid_code));
        rfidsByKey.set(k, arr);
    }
    const taggedCountByKey = new Map<string, number>();
    Array.from(rfidsByKey.entries()).forEach(([k, v]) => taggedCountByKey.set(k, v.length));
    return { taggedCountByKey, rfidsByKey };
}

function isFullyReceived(poId: number, lines: POProductRow[], porRows: PORow[]) {
    for (const ln of lines) {
        const expected = toNum(ln.ordered_quantity);
        if (expected <= 0) continue;
        const received = porRows
            .filter((r) => toNum(r.product_id) === toNum(ln.product_id) && toNum(r.branch_id) === toNum(ln.branch_id ?? 0))
            .reduce((sum, r) => sum + effectiveReceivedQty(r), 0);
        if (received < expected) return false;
    }
    return true;
}

function receivingStatusFrom(poId: number, lines: POProductRow[], porRows: PORow[]): POStatus {
    const fully = isFullyReceived(poId, lines, porRows);
    if (fully) {
        // Even if quantities are fully received, if there are unposted/reverted receipts, it's not truly closed
        const hasUnposted = porRows.some(r => toNum(r.isPosted) === 0 && (toStr(r.receipt_no) || toNum(r.received_quantity) > 0 || toNum(r.is_reverted) === 1));
        if (hasUnposted) return "PARTIAL";
        return "CLOSED";
    }
    const hasAnyPosted = porRows.some(r => toNum(r.isPosted) === 1);
    const hasAnyReceipt = porRows.some(r => effectiveReceivedQty(r) > 0 || toStr(r.receipt_no));
    if (hasAnyPosted || hasAnyReceipt) return "PARTIAL";
    return "OPEN";
}

function resolveLineDiscount(args: {
    pid: number;
    unitPrice: number;
    productLinksMap: Map<number, { supplier_id: number; discount_type: unknown }>;
    discountMap: Map<string, { name: string; pct: number }>;
    headerDiscountPercent: number;
    headerDiscountType: POHeaderRow["discount_type"];
}) {
    const { pid, unitPrice, productLinksMap, discountMap, headerDiscountPercent, headerDiscountType } = args;
    const lineDiscountTypeId = productLinksMap.get(pid)?.discount_type;
    let lineDiscountPercent = 0;
    let lineDiscountTypeStr = "No Discount";

    const resolvedLineId = ensureId(lineDiscountTypeId);
    if (resolvedLineId) {
        const dt = discountMap.get(String(resolvedLineId));
        if (dt) {
            lineDiscountPercent = dt.pct;
            lineDiscountTypeStr = dt.name;
        }
    } else if (headerDiscountPercent > 0) {
        lineDiscountPercent = headerDiscountPercent;
        lineDiscountTypeStr = headerDiscountType ? toStr(headerDiscountType.discount_type || headerDiscountType.discount_code || headerDiscountType.name, "No Discount") : "No Discount";
    }

    const dAmount = unitPrice * (lineDiscountPercent / 100);
    return { lineDiscountPercent, lineDiscountTypeStr, dAmount };
}

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function checkRfidDuplicate(base: string, rfid: string): Promise<{ exists: boolean; detail?: string }> {
    const url = `${base}/items/${POR_ITEMS_COLLECTION}?limit=1&filter[rfid_code][_eq]=${encodeURIComponent(rfid)}&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code`;
    const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
    const row = j?.data?.[0];
    if (!row) return { exists: false };
    return { exists: true, detail: `RFID '${rfid}' is already registered (Item #${row.receiving_item_id}, Product #${row.product_id}).` };
}

async function ensureOpenReceivingRow(args: {
    base: string;
    poId: number;
    productId: number;
    branchId: number;
    unitPrice: number;
    discountTypeId: number | null;
    discountPercent: number;
    isInvoice?: boolean;
}) {
    const { base, poId, productId, branchId, unitPrice, discountTypeId, discountPercent, isInvoice } = args;
    const findUrl = `${base}/items/${POR_COLLECTION}?limit=1&sort=-purchase_order_product_id&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&filter[product_id][_eq]=${encodeURIComponent(String(productId))}&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}&filter[isPosted][_eq]=0&filter[receipt_no][_null]=true&fields=purchase_order_product_id,received_quantity,receipt_no`;
    const found = await fetchJson<{ data: Record<string, unknown>[] }>(findUrl);
    const row = Array.isArray(found?.data) ? found.data[0] : null;
    if (row?.purchase_order_product_id) {
        return { porId: toNum(row.purchase_order_product_id), receivedQty: toNum(row.received_quantity), created: false };
    }
    const discountedAmount = Number((unitPrice * (discountPercent / 100)).toFixed(2));
    const netPrice = unitPrice - discountedAmount;
    const vatExcl = isInvoice ? Number((netPrice / 1.12).toFixed(2)) : netPrice;
    const vatAmount = isInvoice ? Number((netPrice - vatExcl).toFixed(2)) : 0;
    const withholdingAmount = isInvoice ? Number((vatExcl * 0.01).toFixed(2)) : 0;
    const totalAmount = Number(netPrice.toFixed(2));
    const insertUrl = `${base}/items/${POR_COLLECTION}`;
    const payload: Record<string, unknown> = {
        purchase_order_id: poId,
        product_id: productId,
        branch_id: branchId,
        received_quantity: 0,
        unit_price: unitPrice,
        discounted_amount: discountedAmount,
        discount_type: discountTypeId,
        vat_amount: vatAmount,
        withholding_amount: withholdingAmount,
        total_amount: totalAmount,
        isPosted: 0,
        receipt_no: null,
        receipt_date: null,
        received_date: null,
    };
    const created = await fetchJson<{ data: Record<string, unknown> }>(insertUrl, { method: "POST", body: JSON.stringify(payload) });
    const porId = toNum(created?.data?.purchase_order_product_id);
    if (!porId) throw new Error("Failed to create purchase_order_receiving row.");
    return { porId, receivedQty: 0, created: true };
}

export async function GET() {
    try {
        const base = getDirectusBase();
        const poHeaders = await fetchApprovedNotReceivedPOs(base);
        const poIds = poHeaders.map((p) => toNum(p.purchase_order_id)).filter(Boolean);
        if (!poIds.length) return ok([]);
        const urlLines = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&fields=purchase_order_id,product_id,branch_id,ordered_quantity,purchase_order_product_id,unit_price&filter[purchase_order_id][_in]=${poIds.join(",")}`;
        const jl = await fetchJson<{ data: POProductRow[] }>(urlLines);
        const poLinesAll = jl?.data ?? [];
        const porRowsAll = await fetchPORByPOIds(base, poIds);
        const supplierMap = await fetchSupplierNames(base, poHeaders.map((p) => toNum(p.supplier_name)));
        const list = poHeaders.map((po) => {
            const poId = toNum(po.purchase_order_id);
            const lines = poLinesAll.filter((l) => toNum(l.purchase_order_id) === poId);
            const porRows = porRowsAll.filter((r) => toNum(r.purchase_order_id) === poId);

            const hasPending = lines.some(ln => {
                const received = porRows.filter(r => toNum(r.product_id) === toNum(ln.product_id) && toNum(r.branch_id) === toNum(ln.branch_id));
                const totalReceived = received.reduce((sum, r) => sum + effectiveReceivedQty(r), 0);
                return totalReceived < toNum(ln.ordered_quantity);
            });

            const hasUnposted = porRows.some(r => toNum(r.isPosted) === 0 && (toStr(r.receipt_no) || toNum(r.received_quantity) > 0 || toNum(r.is_reverted) === 1));

            if (!hasPending && !hasUnposted && lines.length > 0) return null;

            return {
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplierName: supplierMap.get(toNum(po.supplier_name)) || "—",
                status: receivingStatusFrom(poId, lines, porRows),
                totalAmount: toNum(po.total_amount),
                currency: "PHP",
                itemsCount: new Set(lines.map((l) => l.product_id)).size,
                branchesCount: new Set(lines.map((l) => l.branch_id)).size,
            };
        }).filter(Boolean);
        return ok(list);
    } catch (e: unknown) { return bad((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body.action);

        if (action === "load_receipt") {
            const { poId, receiptNo } = body;
            const url = `${base}/items/${POR_COLLECTION}?limit=-1&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&filter[receipt_no][_eq]=${encodeURIComponent(receiptNo)}&fields=purchase_order_product_id,product_id,branch_id,received_quantity,lot_id,batch_no,expiry_date,receipt_type`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            
            const porIds = (j?.data || []).map(r => toNum(r.purchase_order_product_id)).filter(id => id > 0);
            let rfids: Record<string, unknown>[] = [];
            if (porIds.length > 0) {
                const rfidUrl = `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1&filter[purchase_order_product_id][_in]=${porIds.join(",")}&fields=rfid_code,product_id,purchase_order_product_id,created_at`;
                const rfidJ = await fetchJson<{ data: Record<string, unknown>[] }>(rfidUrl);
                rfids = rfidJ?.data || [];
            }

            // Resolve receipt type ID back to string shortcut for frontend compatibility
            const dbReceiptType = toNum((j?.data || [])[0]?.receipt_type);
            let receiptType = "";
            if (dbReceiptType > 0) {
                const rtMap = await fetchReceiptTypesMap(base);
                receiptType = rtMap.get(dbReceiptType) || "";
            }
            if (!receiptType) {
                receiptType = toStr((j?.data || [])[0]?.receipt_type);
            }
            
            return ok({ items: j?.data || [], rfids, receiptType });
        }

        // ✅ Real-time receipt number duplicate check (lightweight — used by frontend onBlur)
        if (action === "check_receipt_no") {
            const receiptNoCheck = toStr(body.receiptNo).trim();
            const poIdCheck = toNum(body.poId);
            if (!receiptNoCheck || !poIdCheck) return ok({ isDuplicate: false });

            const checkUrl = `${base}/items/${POR_COLLECTION}?limit=1&filter[receipt_no][_eq]=${encodeURIComponent(receiptNoCheck)}&filter[purchase_order_id][_neq]=${poIdCheck}&filter[is_reverted][_neq]=1&fields=purchase_order_id`;
            const checkJ = await fetchJson<{ data: Array<Record<string, unknown>> }>(checkUrl).catch(() => ({ data: [] }));
            if (checkJ?.data?.length) {
                return ok({ isDuplicate: true, existingPoId: checkJ.data[0]?.purchase_order_id });
            }
            return ok({ isDuplicate: false });
        }

        if (action === "open_po") {
            const poId = toNum(body.poId);
            if (!poId) return bad("Missing PO ID");
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=*,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
            const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
            const po = pj?.data;
            if (!po) return bad("PO not found", 404);
            const lines = await fetchPOProductsByPOId(base, poId);
            const porRows = await fetchPORByPOIds(base, [poId]);
            const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porRows.map(r => toNum(r.purchase_order_product_id)), ...lines.map(l => toNum(l.purchase_order_product_id))]);
            const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });
            const productIdsAll = lines.map(l => toNum(l.product_id));
            const productsMap = await fetchProductsMap(base, productIdsAll);
            const branchesMap = await fetchBranchesMap(base, lines.map(l => toNum(l.branch_id ?? 0)));
            const supplierMap = await fetchSupplierNames(base, [toNum(po.supplier_name)]);
            const productLinksMap = await fetchProductSupplierLinks(base, productIdsAll, toNum(po.supplier_name));
            const discountMap = await fetchDiscountTypesMap(base);
            const porIdsByKey = buildPorIdsByKey(porRows);

            let headerDiscountPercent = 0;
            const dType = po.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) {
                headerDiscountPercent = calculateDiscountFromLines(dLines);
            } else if (toNum(dType?.total_percent) > 0) {
                headerDiscountPercent = toNum(dType?.total_percent);
            } else {
                headerDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type || dType?.discount_code || dType?.name));
            }

            if (!headerDiscountPercent) headerDiscountPercent = toNum(po.discount_percentage);

            const allocationsMap = new Map<number, POItem[]>();
            for (const ln of lines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                const p = productsMap.get(pid);
                const pors = porIdsByKey.get(k) || [];
                const receivedQty = pors.reduce((sum, id) => sum + effectiveReceivedQty(porRows.find(r => toNum(r.purchase_order_product_id) === id)!), 0);

                const { lineDiscountTypeStr, dAmount } = resolveLineDiscount({
                    pid,
                    unitPrice: toNum(ln.unit_price),
                    productLinksMap,
                    discountMap,
                    headerDiscountPercent,
                    headerDiscountType: dType
                });

                const openRow = pors.map(id => porRows.find(r => toNum(r.purchase_order_product_id) === id)).find(r => r && (!toStr(r.receipt_no) || toNum(r.is_reverted) === 1));
                const porIdStr = openRow ? String(openRow.purchase_order_product_id) : `${pid}-${bid}`;

                const orderedQty = toNum(ln.ordered_quantity);
                const otherRows = pors.map(id => porRows.find(r => toNum(r.purchase_order_product_id) === id)).filter(r => r && r.purchase_order_product_id !== openRow?.purchase_order_product_id);
                const previousReceivedQty = otherRows.reduce((sum, r) => sum + effectiveReceivedQty(r), 0);
                const remainingQty = Math.max(0, orderedQty - previousReceivedQty);

                const item: POItem = {
                    id: porIdStr,
                    porId: porIdStr,
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: remainingQty,
                    receivedQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: receivedQty >= orderedQty,
                    unitPrice: toNum(ln.unit_price),
                    discountType: lineDiscountTypeStr,
                    discountAmount: dAmount,
                    netAmount: receivedQty * (toNum(ln.unit_price) - dAmount)
                };
                const arr = allocationsMap.get(bid) ?? [];
                arr.push(item);
                allocationsMap.set(bid, arr);
            }
            const lineKeys = new Set(lines.map(l => keyLine(poId, toNum(l.product_id), toNum(l.branch_id ?? 0))));
            const extraPorRows = porRows.filter(r => !lineKeys.has(keyLine(poId, toNum(r.product_id), toNum(r.branch_id ?? 0))));
            const extraKeys = Array.from(new Set(extraPorRows.map(r => keyLine(poId, toNum(r.product_id), toNum(r.branch_id ?? 0)))));
            const missingProductIds = extraPorRows.map(r => toNum(r.product_id)).filter(pid => !productsMap.has(pid));
            if (missingProductIds.length > 0) {
                const missingMap = await fetchProductsMap(base, missingProductIds);
                missingMap.forEach((val, key) => productsMap.set(key, val));
            }
            for (const k of extraKeys) {
                const parts = k.split("::");
                const pid = Number(parts[1]);
                const bid = Number(parts[2]);
                const p = productsMap.get(pid);
                const pors = porIdsByKey.get(k) || [];
                const receivedQty = pors.reduce((sum, id) => sum + effectiveReceivedQty(porRows.find(r => toNum(r.purchase_order_product_id) === id)!), 0);
                const openRow = pors.map(id => porRows.find(r => toNum(r.purchase_order_product_id) === id)).find(r => r && (!toStr(r.receipt_no) || toNum(r.is_reverted) === 1));
                const porIdStr = openRow ? String(openRow.purchase_order_product_id) : `${pid}-${bid}`;

                const { lineDiscountTypeStr, dAmount } = resolveLineDiscount({
                    pid,
                    unitPrice: toNum(p?.cost_per_unit || 0),
                    productLinksMap,
                    discountMap,
                    headerDiscountPercent,
                    headerDiscountType: dType
                });

                const uPrice = toNum(p?.cost_per_unit || 0);

                const item: POItem = {
                    id: porIdStr,
                    porId: porIdStr,
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: 0,
                    receivedQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: receivedQty > 0,
                    unitPrice: uPrice,
                    discountType: lineDiscountTypeStr,
                    discountAmount: dAmount,
                    netAmount: receivedQty * (uPrice - dAmount),
                    isExtra: true
                };
                const arr = allocationsMap.get(bid) ?? [];
                arr.push(item);
                allocationsMap.set(bid, arr);
            }
            const rtMap = await fetchReceiptTypesMap(base);
            const uniqueReceipts = Array.from(new Set(porRows.map(r => r.receipt_no).filter(Boolean)));
            const history = uniqueReceipts.map(rno => {
                const rowsForReceipt = porRows.filter(r => r.receipt_no === rno);
                const isReverted = rowsForReceipt.some(r => toNum(r.is_reverted) === 1);
                const dbReceiptType = toNum(rowsForReceipt[0]?.receipt_type);
                const receiptType = (dbReceiptType > 0 ? rtMap.get(dbReceiptType) : null) || toStr(rowsForReceipt[0]?.receipt_type);
                return { receiptNo: rno, receiptDate: rowsForReceipt[0]?.receipt_date || rowsForReceipt[0]?.received_date || "", receiptType, isPosted: rowsForReceipt.every(r => toNum(r.isPosted) === 1), isReverted, itemsCount: rowsForReceipt.length };
            }).sort((a, b) => b.receiptNo!.localeCompare(a.receiptNo!));

            // ✅ Build draftData: POR rows where receipt_no is null OR is_reverted is 1, and received_quantity > 0
            const draftRows = porRows.filter(r => (!toStr(r.receipt_no) || toNum(r.is_reverted) === 1) && toNum(r.received_quantity) > 0);
            const draftData = draftRows.map(r => {
                const dbReceiptType = toNum(r.receipt_type);
                const receiptTypeStr = (dbReceiptType > 0 ? rtMap.get(dbReceiptType) : null) || toStr(r.receipt_type);
                return {
                    porId: toNum(r.purchase_order_product_id),
                    productId: toNum(r.product_id),
                    branchId: toNum(r.branch_id),
                    receivedQuantity: toNum(r.received_quantity),
                    batchNo: toStr(r.batch_no) || null,
                    expiryDate: toStr(r.expiry_date) || null,
                    lotId: r.lot_id ? toNum(r.lot_id) : null,
                    receiptNo: toStr(r.receipt_no) || null,
                    receiptDate: toStr(r.receipt_date) || null,
                    receiptType: receiptTypeStr || null,
                };
            });

            const draftPorIds = draftRows.map(r => toNum(r.purchase_order_product_id)).filter(id => id > 0);
            let draftRfids: Record<string, unknown>[] = [];
            if (draftPorIds.length > 0) {
                const rfidUrl = `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1&filter[purchase_order_product_id][_in]=${draftPorIds.join(",")}&fields=rfid_code,product_id,purchase_order_product_id,created_at`;
                const rfidJ = await fetchJson<{ data: Record<string, unknown>[] }>(rfidUrl).catch(() => ({ data: [] }));
                draftRfids = rfidJ?.data || [];
            }

            return ok({
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplier: { id: String(po.supplier_name), name: supplierMap.get(toNum(po.supplier_name)) || "Supplier Name" },
                status: receivingStatusFrom(poId, lines, porRows),
                allocations: Array.from(allocationsMap.entries()).map(([branchId, items]) => ({ branch: { id: String(branchId || "0"), name: branchesMap.get(branchId) || `Branch ${branchId}` }, items })),
                priceType: toStr(po.price_type, "Cost Per Unit"),
                isInvoice: (toNum((po as unknown as Record<string, unknown>)?.vat_amount) > 0) || (toNum((po as unknown as Record<string, unknown>)?.withholding_tax_amount) > 0),
                createdAt: po.date_encoded ? new Date(po.date_encoded).toISOString() : new Date().toISOString(),
                history,
                draftData: draftData.length > 0 ? draftData : undefined,
                draftRfids: draftRfids.length > 0 ? draftRfids : undefined,
            });
        }
        if (action === "scan_rfid") {
            const rawRfid = toStr(body.rfid);
            const rfid = normalizeRfid(rawRfid);
            const poId = toNum(body.poId);
            if (!rfid || rfid.length !== RFID_LEN) return bad(`Invalid RFID. Must be exactly ${RFID_LEN} hex characters.`, 400);
            const url = `${base}/items/${POR_ITEMS_COLLECTION}?limit=1&filter[rfid_code][_eq]=${encodeURIComponent(rfid)}&fields=receiving_item_id,purchase_order_product_id,product_id,rfid_code`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            const row = j?.data?.[0];
            if (!row) {
                const lines = await fetchPOProductsByPOId(base, poId);
                const productsMap = await fetchProductsMap(base, lines.map(l => toNum(l.product_id)));
                const branchesMap = await fetchBranchesMap(base, lines.map(l => toNum(l.branch_id ?? 0)));
                const untaggedItems = lines.map((ln) => {
                    const pid = toNum(ln.product_id);
                    const bid = toNum(ln.branch_id ?? 0);
                    const p = productsMap.get(pid);
                    return { productId: String(pid), branchId: String(bid), name: toStr(p?.product_name, `Product #${pid}`), barcode: productDisplayCode(p, pid), branchName: branchesMap.get(bid) || "Unassigned", expectedQty: toNum(ln.ordered_quantity) };
                });
                return ok({ status: "unknown", rfid, items: untaggedItems });
            }

            // RFID is known! Fetch associated product and PO for better feedback
            let productName = "Unknown Product";
            let poNumber = "Unknown PO";
            try {
                const porProdId = toNum(row.purchase_order_product_id);
                const prodUrl = `${base}/items/${PO_PRODUCTS_COLLECTION}/${porProdId}?fields=product_id.product_name,purchase_order_id.purchase_order_no`;
                const pdj = await fetchJson<{ data: { product_id?: { product_name?: string }; purchase_order_id?: { purchase_order_no?: string } } }>(prodUrl);
                const pd = pdj?.data;
                if (pd) {
                    productName = pd.product_id?.product_name || productName;
                    poNumber = pd.purchase_order_id?.purchase_order_no || poNumber;
                }
            } catch (e) {
                console.error("Failed to fetch tag owner details:", e);
            }

            return ok({
                status: "known",
                rfid: row.rfid_code,
                porId: String(row.purchase_order_product_id),
                productName,
                poNumber,
                alreadyReceived: true
            });
        }
        if (action === "lookup_product") {
            const code = toStr(body.barcode).trim();
            if (!code) return bad("Missing barcode/SKU");
            const url = `${base}/items/${PRODUCTS_COLLECTION}?limit=1&filter[_or][0][barcode][_eq]=${encodeURIComponent(code)}&filter[_or][1][product_code][_eq]=${encodeURIComponent(code)}&fields=product_id,product_name,barcode,product_code,cost_per_unit,unit_of_measurement.*,unit_of_measurement_count`;
            const j = await fetchJson<{ data: ProductRow[] }>(url);
            const p = j?.data?.[0];
            if (!p) return bad("Product not found", 404);
            const uomId = Number(p.unit_of_measurement?.unit_id ?? p.unit_of_measurement);
            if (uomId !== 11 && uomId !== 1) {
                return bad("Only 'Box' or 'Piece' UOM allowed.", 400);
            }

            if (uomId === 1) {
                // Check if a Box variant exists for this product name
                const boxUrl = `${base}/items/${PRODUCTS_COLLECTION}?limit=1&filter[product_name][_eq]=${encodeURIComponent(String(p.product_name))}&filter[unit_of_measurement][_eq]=11&fields=product_id`;
                const boxJ = await fetchJson<{ data: Record<string, unknown>[] }>(boxUrl).catch(() => null);
                if (boxJ && Array.isArray(boxJ.data) && boxJ.data.length > 0) {
                    return bad("A Box variant exists for this product. Please use the Box variant.", 400);
                }
            }

            return ok({
                productId: String(p.product_id),
                name: String(p.product_name),
                barcode: String(p.barcode || p.product_code),
                unitPrice: toNum(p.cost_per_unit)
            });
        }

        // -------------------------
        // tag_and_receive — on-the-fly tagging + receiving
        // -------------------------
        if (action === "tag_and_receive") {
            const poId = toNum(body.poId);
            const productId = toNum(body.productId);
            const branchId = toNum(body.branchId);
            const rawRfid = toStr(body.rfid);
            const rfid = normalizeRfid(rawRfid);

            if (!poId) return bad("Missing poId.", 400);
            if (!productId) return bad("Missing productId.", 400);
            if (!branchId) return bad("Missing branchId.", 400);
            if (!rfid || rfid.length !== RFID_LEN) {
                return bad(`Invalid RFID. Must be exactly ${RFID_LEN} hex characters.`, 400);
            }

            // ✅ RFID duplicate validation (global check across ALL POs)
            const dup = await checkRfidDuplicate(base, rfid);
            if (dup.exists) return bad(dup.detail ?? "Duplicate RFID.", 409);

            // ✅ Fetch current totals to enforce cap
            const porRows = await fetchPORByPOIds(base, [poId]);
            const lines = await fetchPOProductsByPOId(base, poId);
            const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porRows.map(r => toNum(r.purchase_order_product_id)), ...lines.map(l => toNum(l.purchase_order_product_id))]);
            const { taggedCountByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });

            const matchingLine = lines.find((ln: POProductRow) => toNum(ln.product_id) === productId && toNum(ln.branch_id ?? 0) === branchId);

            if (matchingLine) {
                const currentCount = taggedCountByKey.get(keyLine(poId, productId, branchId)) ?? 0;
                const expected = toNum(matchingLine.ordered_quantity);
                if (currentCount >= expected) {
                    return bad(`Scanning limit reached. This line only expects ${expected} items.`, 403);
                }
            }

            // Resolve discount from PO header
            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=discount_type.*,discount_type.line_per_discount_type.line_id.*,discount_percentage,vat_amount,withholding_tax_amount`;
            const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
            const po = pj?.data;

            let poDiscountPercent = toNum(po?.discount_percentage);
            const dType = po?.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) {
                poDiscountPercent = calculateDiscountFromLines(dLines);
            } else if (!poDiscountPercent) {
                poDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));
            }

            const productLinksMap = await fetchProductSupplierLinks(base, [productId], toNum(po?.supplier_name));
            const discountMap = await fetchDiscountTypesMap(base);

            const lineDiscountTypeId = productLinksMap.get(productId)?.discount_type;
            let discountPercent = 0;
            let discountTypeId = null;

            const resolvedLineId = ensureId(lineDiscountTypeId);
            if (resolvedLineId) {
                discountTypeId = resolvedLineId;
                const dt = discountMap.get(String(resolvedLineId));
                if (dt) {
                    discountPercent = dt.pct;
                }
            } else {
                discountTypeId = ensureId(dType);
                discountPercent = poDiscountPercent;
            }

            let unitPrice = 0;
            if (matchingLine) {
                unitPrice = toNum(matchingLine.unit_price);
            } else {
                const pUrl = `${base}/items/${PRODUCTS_COLLECTION}/${productId}?fields=cost_per_unit`;
                const productJ = await fetchJson<{ data: ProductRow }>(pUrl);
                unitPrice = toNum(productJ?.data?.cost_per_unit || 0);
            }

            const isInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);

            const ensured = await ensureOpenReceivingRow({
                base,
                poId,
                productId,
                branchId,
                unitPrice,
                discountTypeId,
                discountPercent,
                isInvoice
            });

            await fetchJson(`${base}/items/${POR_ITEMS_COLLECTION}`, {
                method: "POST",
                body: JSON.stringify({
                    purchase_order_product_id: ensured.porId,
                    product_id: productId,
                    rfid_code: rfid,
                    created_at: nowISO()
                }),
            });

            return ok({
                status: "tagged",
                porId: String(ensured.porId),
                rfid,
                productId: String(productId),
                branchId: String(branchId),
                created: ensured.created,
                isExtra: !matchingLine
            });
        }

        if (action === "save_receipt") {
            const poId = toNum(body.poId);
            const receiptNo = toStr(body.receiptNo);
            const receiptDate = toStr(body.receiptDate);
            const receiptType = toStr(body.receiptType);

            // Resolve receipt type to integer ID from database (sales_invoice_type)
            let resolvedReceiptTypeId: number | null = null;
            if (receiptType) {
                const num = Number(receiptType);
                if (Number.isInteger(num) && num > 0) {
                    resolvedReceiptTypeId = num;
                } else {
                    try {
                        const typesUrl = `${base}/items/sales_invoice_type?limit=-1&fields=id,type,shortcut`;
                        const resTypes = await fetchJson<{ data: Array<{ id: number; type: string; shortcut: string }> }>(typesUrl).catch(() => ({ data: [] }));
                        const found = (resTypes?.data || []).find(t => 
                            String(t.shortcut).trim().toUpperCase() === receiptType.trim().toUpperCase() ||
                            String(t.type).trim().toUpperCase() === receiptType.trim().toUpperCase() ||
                            String(t.id) === receiptType
                        );
                        if (found) {
                            resolvedReceiptTypeId = found.id;
                        }
                    } catch (e) {
                        console.error("Failed to resolve receipt type:", e);
                    }
                }
            }

            const porCounts = body.porCounts as Record<string, number>;
            const porMetaData = body.porMetaData as Record<string, Record<string, unknown>>;
            const receiverId = body.receiverId;
            const newTags = body.newTags as Array<{ rfid: string; productId: string; porId?: string }>;
            const isEdit = !!body.isEdit;
            const editReceiptNo = body.editingReceiptNo || receiptNo;

            if (!poId) return bad("Missing poId.");
            if (!receiptNo) return bad("Missing receipt number.");

            // ✅ Date Validation: Prevent invalid years (e.g., 6-digit years like "151531")
            const trimmedDate = receiptDate.trim();
            if (trimmedDate) {
                const parsedDate = new Date(trimmedDate);
                const year = parsedDate.getFullYear();
                if (isNaN(year) || year < 2000 || year > 3000) {
                    return bad("Invalid Receipt Date. Year must be between 2000 and 3000.", 400);
                }
            }

            // ✅ Cross-PO Receipt Number Uniqueness Check
            const trimmedReceiptNo = receiptNo.trim();
            const dupCheckUrl = `${base}/items/${POR_COLLECTION}?limit=1&filter[receipt_no][_eq]=${encodeURIComponent(trimmedReceiptNo)}&filter[purchase_order_id][_neq]=${poId}&filter[is_reverted][_neq]=1&fields=purchase_order_product_id,purchase_order_id`;
            const dupCheckJ = await fetchJson<{ data: Array<Record<string, unknown>> }>(dupCheckUrl).catch(() => ({ data: [] }));
            if (dupCheckJ?.data?.length) {
                return bad(`Receipt Number "${trimmedReceiptNo}" is already in use on another Purchase Order (PO ID: ${dupCheckJ.data[0]?.purchase_order_id}).`, 409);
            }

            const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=purchase_order_id,purchase_order_no,supplier_name,discount_type.*,discount_type.line_per_discount_type.line_id.*,inventory_status,price_type,date_encoded,vat_amount,withholding_tax_amount`;
            const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
            const po = pj?.data;
            const poIsInvoice = (toNum(po?.vat_amount) > 0) || (toNum(po?.withholding_tax_amount) > 0);
            let poDiscountPercent = 0;
            const dType = po?.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) poDiscountPercent = calculateDiscountFromLines(dLines);
            else if (toNum(dType?.total_percent) > 0) poDiscountPercent = toNum(dType?.total_percent);
            else poDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));

            const discountMap = await fetchDiscountTypesMap(base);
            const porRows = await fetchPORByPOIds(base, [poId]);
            const lines = await fetchPOProductsByPOId(base, poId);
            const productIdsSet = new Set<number>();
            lines.forEach(l => productIdsSet.add(toNum(l.product_id)));
            porRows.forEach(r => productIdsSet.add(toNum(r.product_id)));
            Object.keys(porCounts).forEach(k => { if (k.includes("-")) productIdsSet.add(toNum(k.split("-")[0])); });
            const linksMap = await fetchProductSupplierLinks(base, Array.from(productIdsSet), toNum(po?.supplier_name));

            // ✅ 1. Resolve Composite Keys & Cache Real POR IDs
            const realPorIdsByLocalKey = new Map<string, number>();

            for (const [key, qtyNum] of Object.entries(porCounts)) {
                const qty = toNum(qtyNum);
                if (qty <= 0) continue;
                if (String(key).includes("-")) {
                    const [pidStr, bidStr] = key.split("-");
                    const pid = toNum(pidStr), bid = toNum(bidStr);
                    const ml = lines.find(l => toNum(l.product_id) === pid && toNum(l.branch_id) === bid);
                    let uPrice = 0;
                    if (ml) uPrice = toNum(ml.unit_price);
                    else {
                        const pj2 = await fetchJson<{ data: ProductRow }>(`${base}/items/${PRODUCTS_COLLECTION}/${pid}?fields=cost_per_unit`).catch(() => null);
                        uPrice = toNum(pj2?.data?.cost_per_unit || 0);
                    }

                    const lineTypeId = linksMap.get(pid)?.discount_type;
                    let linePct = poDiscountPercent;
                    let resolvedId = ensureId(lineTypeId);
                    if (resolvedId) {
                        const dt = discountMap.get(String(resolvedId));
                        if (dt) { linePct = dt.pct; }
                    } else resolvedId = ensureId(dType);

                    const ensured = await ensureOpenReceivingRow({ base, poId, productId: pid, branchId: bid, unitPrice: uPrice, discountTypeId: resolvedId, discountPercent: linePct, isInvoice: poIsInvoice });

                    realPorIdsByLocalKey.set(key, ensured.porId);

                    // Add to cache so the next loop doesn't need to fetch it
                    porRows.push({
                        purchase_order_product_id: ensured.porId,
                        purchase_order_id: poId,
                        product_id: pid,
                        branch_id: bid,
                        unit_price: uPrice,
                        discount_type: resolvedId,
                        received_quantity: ensured.receivedQty,
                        receipt_no: null,
                    });
                } else {
                    realPorIdsByLocalKey.set(key, toNum(key));
                }
            }

            // ✅ Handle Edit Mode: Remove tags that were deleted from the UI
            if (isEdit) {
                const existingRows = porRows.filter(r => toStr(r.receipt_no) === editReceiptNo);
                const existingPorIds = existingRows.map(r => toNum(r.purchase_order_product_id)).filter(id => id > 0);
                
                if (existingPorIds.length > 0) {
                    const rfidUrl = `${base}/items/${POR_ITEMS_COLLECTION}?limit=-1&filter[purchase_order_product_id][_in]=${existingPorIds.join(",")}&fields=receiving_item_id,rfid_code`;
                    const existingRfidsRes = await fetchJson<{ data: Array<{ receiving_item_id: number, rfid_code: string }> }>(rfidUrl).catch(() => null);
                    const existingRfids = existingRfidsRes?.data || [];
                    
                    const newRfidCodes = new Set(Array.isArray(newTags) ? newTags.map(t => t.rfid) : []);
                    const toDelete = existingRfids.filter(r => !newRfidCodes.has(r.rfid_code));
                    
                    for (const r of toDelete) {
                        await fetchJson(`${base}/items/${POR_ITEMS_COLLECTION}/${r.receiving_item_id}`, { method: "DELETE" }).catch(() => {});
                    }
                }
            }

            // ✅ 2. Persist RFID Tags (resolving local IDs to real IDs)
            if (Array.isArray(newTags)) {
                for (const t of newTags) {
                    if (!t.rfid || !t.porId) continue;
                    const realPorId = realPorIdsByLocalKey.get(String(t.porId)) || toNum(t.porId);
                    if (!realPorId) continue;

                    // Double check if already exists to prevent duplication
                    const check = await checkRfidDuplicate(base, t.rfid);
                    if (check.exists) continue;

                    await fetchJson(`${base}/items/${POR_ITEMS_COLLECTION}`, {
                        method: "POST",
                        body: JSON.stringify({
                            purchase_order_product_id: realPorId,
                            product_id: toNum(t.productId),
                            rfid_code: t.rfid,
                            created_at: nowISO()
                        })
                    }).catch(() => { });
                }
            }

            // ✅ 3. Aggregate ALL Tags for the PO to Recalculate Totals (Source of Truth)
            const allPorRows = [...porRows];
            const receivingItems = await fetchReceivingItemsByLinkIds(base, allPorRows.map(r => toNum(r.purchase_order_product_id)));
            const tagCountByPorId = new Map<number, number>();
            receivingItems.forEach(it => {
                const id = toNum(it.purchase_order_product_id);
                tagCountByPorId.set(id, (tagCountByPorId.get(id) || 0) + 1);
            });

            // ✅ 4. Update POR Rows
            const meta = (porMetaData && typeof porMetaData === "object") ? porMetaData : {};

            // 🔥 Collect all unique POR IDs that should be in this receipt:
            // 1. Items scanned in THIS session (in porCounts)
            // 2. If editing/reverting, items currently saved under this receipt number
            const involvedPorIds = new Set<number>();
            realPorIdsByLocalKey.forEach(id => involvedPorIds.add(id));
            const existingRows = porRows.filter(r => toStr(r.receipt_no) === editReceiptNo);
            existingRows.forEach(r => involvedPorIds.add(toNum(r.purchase_order_product_id)));

            for (const realPorId of Array.from(involvedPorIds)) {
                // Find localKey if it exists, otherwise use realPorId
                let localKey = String(realPorId);
                for (const [lk, rId] of realPorIdsByLocalKey.entries()) {
                    if (rId === realPorId) { localKey = lk; break; }
                }

                const m = meta[localKey] || meta[String(realPorId)] || {};

                let pr = allPorRows.find(r => toNum(r.purchase_order_product_id) === realPorId);
                if (!pr) continue;

                const uPrice = toNum(pr.unit_price || 0);
                const pId = toNum(pr.product_id);

                let linePct = poDiscountPercent, dtId = ensureId(pr?.discount_type);
                if (dtId) {
                    const dt = discountMap.get(String(dtId));
                    if (dt) linePct = dt.pct;
                } else {
                    const linkId = ensureId(linksMap.get(pId)?.discount_type);
                    if (linkId) { const dt = discountMap.get(String(linkId)); if (dt) { linePct = dt.pct; dtId = linkId; } }
                    if (!dtId) dtId = ensureId(dType);
                }

                // 🔥 Recalculate: Use absolute tag count if tags exist, otherwise use delta for barcode-scanned items
                const tagCount = tagCountByPorId.get(realPorId) || 0;
                const sessionQty = toNum(porCounts[localKey]);
                const newQty = tagCount > 0 ? tagCount : sessionQty;

                // If quantity is now 0, reset or delete the item from this receipt
                if (newQty <= 0) {
                    const isExtra = !lines.some(l => toNum(l.product_id) === pId && toNum(l.branch_id ?? 0) === toNum(pr.branch_id ?? 0));
                    if (isExtra) {
                        await fetchJson(`${base}/items/${POR_COLLECTION}/${realPorId}`, { method: "DELETE" }).catch(() => {});
                    } else {
                        const resetPatch = {
                            receipt_no: null, receipt_date: null, receipt_type: null, received_quantity: 0, received_date: null, isPosted: 0, is_reverted: 0,
                            discounted_amount: 0, vat_amount: 0, withholding_amount: 0, total_amount: 0,
                            lot_id: null, batch_no: null, expiry_date: null
                        };
                        await fetchJson(`${base}/items/${POR_COLLECTION}/${realPorId}`, { method: "PATCH", body: JSON.stringify(resetPatch) });
                    }
                    continue;
                }

                const lineGross = uPrice * newQty;
                const lineDisc = Number((lineGross * (linePct / 100)).toFixed(2));
                const lineNet = lineGross - lineDisc;
                const vatExclTotal = poIsInvoice ? Number((lineNet / 1.12).toFixed(2)) : lineNet;
                const vatAmtTotal = poIsInvoice ? Number((lineNet - vatExclTotal).toFixed(2)) : 0;
                const ewtAmtTotal = poIsInvoice ? Number((vatExclTotal * 0.01).toFixed(2)) : 0;

                const patch: Record<string, unknown> = {
                    receipt_no: receiptNo, receipt_date: receiptDate, receipt_type: resolvedReceiptTypeId || null, received_quantity: newQty, received_date: nowISO(), isPosted: 0, is_reverted: 0,
                    discount_type: dtId || null, discounted_amount: lineDisc,
                    vat_amount: vatAmtTotal, withholding_amount: ewtAmtTotal,
                    total_amount: Number(lineGross.toFixed(2))
                };
                if (m.lotId !== undefined && m.lotId !== null && m.lotId !== "") patch.lot_id = toNum(m.lotId);
                if (m.batchNo !== undefined && m.batchNo !== null) patch.batch_no = String(m.batchNo).trim() || null;
                if (m.expiryDate) patch.expiry_date = m.expiryDate;

                await fetchJson(`${base}/items/${POR_COLLECTION}/${realPorId}`, { method: "PATCH", body: JSON.stringify(patch) });
            }

            const fLines = await fetchPOProductsByPOId(base, poId);
            const fPors = await fetchPORByPOIds(base, [poId]);

            // ✅ Receiving no longer updates PO header status or financials.
            // Post Inventory is the sole authority for status transitions (6/9).
            // Only track the receiver_id if provided.
            if (receiverId) {
                await fetchJson(`${base}/items/${PO_COLLECTION}/${poId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ receiver_id: receiverId })
                }).catch(e => console.error("Failed to update PO receiver_id:", e));
            }

            const updatedPorIdsByKey = buildPorIdsByKey(fPors);
            const allProductIdsSet = new Set<number>();
            fLines.forEach(l => allProductIdsSet.add(toNum(l.product_id)));
            fPors.forEach(r => allProductIdsSet.add(toNum(r.product_id)));
            const updatedProductsMap = await fetchProductsMap(base, Array.from(allProductIdsSet));
            const allBranchIdsSet = new Set<number>();
            fLines.forEach(l => allBranchIdsSet.add(toNum(l.branch_id ?? 0)));
            fPors.forEach(r => allBranchIdsSet.add(toNum(r.branch_id)));
            const updatedBranchesMap = await fetchBranchesMap(base, Array.from(allBranchIdsSet));
            const updatedSupplierMap = await fetchSupplierNames(base, [toNum(po?.supplier_name)]);
            const updatedReceivingItems = await fetchReceivingItemsByLinkIds(base, fPors.map(r => toNum(r.purchase_order_product_id)));
            const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: fLines, porRows: fPors, receivingItems: updatedReceivingItems });

            const allocationsMap = new Map<number, POItem[]>();
            const processedLinesSet = new Set<string>();

            for (const ln of fLines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                processedLinesSet.add(k);
                const p = updatedProductsMap.get(pid);
                const pors = updatedPorIdsByKey.get(k) || [];
                const allRows = pors.map(id => fPors.find(x => toNum(x.purchase_order_product_id) === id)).filter(Boolean);
                const currentRows = allRows.filter(r => toStr(r!.receipt_no) === receiptNo);
                const previousRows = allRows.filter(r => toStr(r!.receipt_no) !== receiptNo);
                const prevRecQty = previousRows.reduce((sum, r) => sum + effectiveReceivedQty(r!), 0);
                const currRecQty = currentRows.reduce((sum, r) => sum + effectiveReceivedQty(r!), 0);
                const ordered = toNum(ln.ordered_quantity);
                const startingBalance = Math.max(0, ordered - prevRecQty);

                if (currRecQty <= 0 && startingBalance <= 0) continue;

                const { lineDiscountTypeStr, dAmount } = resolveLineDiscount({
                    pid,
                    unitPrice: toNum(ln.unit_price),
                    productLinksMap: linksMap,
                    discountMap,
                    headerDiscountPercent: poDiscountPercent,
                    headerDiscountType: dType
                });

                allocationsMap.set(bid, [...(allocationsMap.get(bid) ?? []), {
                    id: String(pors[0] || pid),
                    porId: String(pors[0] || ""),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: startingBalance,
                    receivedQty: currRecQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: currRecQty >= startingBalance && startingBalance > 0,
                    unitPrice: toNum(ln.unit_price),
                    discountType: lineDiscountTypeStr,
                    discountAmount: dAmount,
                    netAmount: currRecQty * (toNum(ln.unit_price) - dAmount),
                }]);
            }

            // Extra rows
            for (const r of fPors) {
                if (toStr(r.receipt_no) !== receiptNo) continue;
                const pid = toNum(r.product_id), bid = toNum(r.branch_id);
                const k = keyLine(poId, pid, bid);
                if (processedLinesSet.has(k)) continue;
                processedLinesSet.add(k);
                const p = updatedProductsMap.get(pid);
                const currRecQty = effectiveReceivedQty(r);
                const uPrice = toNum(r.unit_price);
                const { lineDiscountTypeStr, dAmount } = resolveLineDiscount({
                    pid,
                    unitPrice: uPrice,
                    productLinksMap: linksMap,
                    discountMap,
                    headerDiscountPercent: poDiscountPercent,
                    headerDiscountType: dType
                });

                allocationsMap.set(bid, [...(allocationsMap.get(bid) ?? []), {
                    id: String(r.purchase_order_product_id),
                    porId: String(r.purchase_order_product_id),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: 0,
                    receivedQty: currRecQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: true,
                    unitPrice: uPrice,
                    discountType: lineDiscountTypeStr,
                    discountAmount: dAmount,
                    netAmount: currRecQty * (uPrice - dAmount),
                    isExtra: true
                }]);
            }

            const detail = {
                id: String(poId),
                poNumber: toStr(po?.purchase_order_no),
                supplier: { id: String(po?.supplier_name), name: updatedSupplierMap.get(toNum(po?.supplier_name)) || "Supplier" },
                status: receivingStatusFrom(poId, fLines, fPors),
                allocations: Array.from(allocationsMap.entries()).map(([bid, items]) => ({
                    branch: { id: String(bid), name: updatedBranchesMap.get(bid) || "Unassigned" },
                    items,
                })),
                receiptNo,
                receiptDate,
                isFullyReceived: isFullyReceived(poId, fLines, fPors),
                isInvoice: poIsInvoice,
                savedAt: Date.now(),
            };
            return ok({ ok: true, detail });
        }

        if (action === "get_supplier_products") {
            const supplierId = toNum(body.supplierId);
            if (!supplierId) return bad("Missing Supplier ID", 400);

            // Fetch links with expanded discount info
            const linksUrl = `${base}/items/${PRODUCT_SUPPLIER_COLLECTION}?limit=-1&filter[supplier_id][_eq]=${supplierId}&fields=product_id,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
            const lj = await fetchJson<{ data: Array<Record<string, unknown>> }>(linksUrl);
            const links = lj?.data ?? [];
            if (!links.length) return ok([]);

            const pids = links.map(r => toNum(r.product_id)).filter(id => id > 0);
            if (!pids.length) return ok([]);

            // Then get the full product details (Box and Piece items)
            const map = await fetchProductsMap(base, pids);

            const rawResults = links.map(link => {
                const pid = toNum(link.product_id);
                const p = map.get(pid);
                if (!p) return null;

                const uomId = Number(p.unit_of_measurement?.unit_id ?? p.unit_of_measurement);
                if (uomId !== 11 && uomId !== 1) return null;

                const dt = link.discount_type as Record<string, unknown> | null | undefined;
                let discTypeStr = "No Discount";
                let discPct = 0;
                if (dt) {
                    discTypeStr = toStr(dt.discount_type || dt.name, "No Discount");
                    const lines = (dt.line_per_discount_type as DiscountLine[]) || [];
                    if (lines.length > 0) discPct = calculateDiscountFromLines(lines);
                    else if (toNum(dt?.total_percent) > 0) discPct = toNum(dt?.total_percent);
                    else discPct = deriveDiscountPercentFromCode(discTypeStr);
                }

                return {
                    productId: String(pid),
                    name: String(p.product_name),
                    sku: String(p.barcode || p.product_code),
                    barcode: String(p.barcode || p.product_code),
                    unitPrice: toNum(p.cost_per_unit),
                    uomId: uomId,
                    uom: String(p.unit_of_measurement?.unit_shortcut ?? (uomId === 11 ? "BOX" : "PCS")).toUpperCase(),
                    discountType: discTypeStr,
                    discountPercent: discPct
                };
            }).filter(Boolean) as Array<{
                productId: string;
                name: string;
                sku: string;
                barcode: string;
                unitPrice: number;
                uomId: number;
                uom: string;
                discountType: string;
                discountPercent: number;
            }>;

            // Box Priority Logic: group by name, keep Box if exists, else Piece
            const groupedByName = new Map<string, typeof rawResults>();
            for (const item of rawResults) {
                const arr = groupedByName.get(item.name) || [];
                arr.push(item);
                groupedByName.set(item.name, arr);
            }

            const results: typeof rawResults = [];
            groupedByName.forEach((items) => {
                const boxItem = items.find(i => i.uomId === 11);
                if (boxItem) {
                    results.push(boxItem);
                } else {
                    const pieceItem = items.find(i => i.uomId === 1);
                    if (pieceItem) {
                        results.push(pieceItem);
                    }
                }
            });

            return ok(results.map(r => ({
                productId: r.productId,
                name: r.name,
                sku: r.sku,
                barcode: r.barcode,
                unitPrice: r.unitPrice,
                uom: r.uom,
                discountType: r.discountType,
                discountPercent: r.discountPercent
            })));
        }

        if (action === "get_lots") {
            const url = `${base}/items/${LOTS_COLLECTION}?limit=-1&sort=lot_name&fields=lot_id,lot_name`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            return ok(j?.data ?? []);
        }

        if (action === "get_units") {
            const url = `${base}/items/${UNITS_COLLECTION}?limit=-1&sort=unit_name&fields=unit_id,unit_name,unit_shortcut`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            return ok(j?.data ?? []);
        }

        return bad("Unknown action");
    } catch (e: unknown) {
        return bad((e as Error).message, 500);
    }
}
