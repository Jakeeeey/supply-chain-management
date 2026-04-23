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
function pickNum(obj: Record<string, unknown> | null | undefined, keys: string[]) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) {
            const n = toNum(obj[k]);
            if (n !== 0) return n;
        }
    }
    return 0;
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
        line_per_discount_type?: DiscountLine[];
    } | null;
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
        "filter[date_received][_null]=true", "filter[inventory_status][_neq]=13",
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
    lot_id?: string | number;
    batch_no?: string;
    expiry_date?: string;
    unit_price?: string | number;
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

const POR_SAFE_FIELDS = "purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,lot_id,batch_no,expiry_date";


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
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount,discount_type`;
    const j = await fetchJson<{ data: POProductRow[] }>(url);
    return (j?.data ?? []);
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

function effectiveReceivedQty(por: PORow) {
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
    for (const [k, v] of rfidsByKey.entries()) taggedCountByKey.set(k, v.length);
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
    if (fully) return "CLOSED";
    const hasAnyPosted = porRows.some(r => toNum(r.isPosted) === 1);
    const hasAnyReceipt = porRows.some(r => effectiveReceivedQty(r) > 0 || toStr(r.receipt_no));
    if (hasAnyPosted || hasAnyReceipt) return "PARTIAL";
    return "OPEN";
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
}) {
    const { base, poId, productId, branchId, unitPrice, discountTypeId, discountPercent } = args;
    const findUrl = `${base}/items/${POR_COLLECTION}?limit=1&sort=-purchase_order_product_id&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&filter[product_id][_eq]=${encodeURIComponent(String(productId))}&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}&filter[isPosted][_eq]=0&fields=purchase_order_product_id,received_quantity,receipt_no`;
    const found = await fetchJson<{ data: Record<string, unknown>[] }>(findUrl);
    const row = Array.isArray(found?.data) ? found.data[0] : null;
    if (row?.purchase_order_product_id) {
        return { porId: toNum(row.purchase_order_product_id), receivedQty: toNum(row.received_quantity), created: false };
    }
    const discountedAmount = Number((unitPrice * (discountPercent / 100)).toFixed(2));
    const netPrice = unitPrice - discountedAmount;
    const vatAmount = Number((netPrice * 0.12).toFixed(2));
    const withholdingAmount = Number((netPrice * 0.01).toFixed(2));
    const totalAmount = Number((netPrice + vatAmount).toFixed(2));
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
        const urlLines = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&fields=purchase_order_id,product_id,branch_id,ordered_quantity,purchase_order_product_id,unit_price,discount_type&filter[purchase_order_id][_in]=${poIds.join(",")}`;
        const jl = await fetchJson<{ data: POProductRow[] }>(urlLines);
        const poLinesAll = jl?.data ?? [];
        const porRowsAll = await fetchPORByPOIds(base, poIds);
        const supplierMap = await fetchSupplierNames(base, poHeaders.map((p) => toNum(p.supplier_name)));
        const list = poHeaders.map((po) => {
            const poId = toNum(po.purchase_order_id);
            const lines = poLinesAll.filter((l) => toNum(l.purchase_order_id) === poId);
            const porRows = porRowsAll.filter((r) => toNum(r.purchase_order_id) === poId);
            if (isFullyReceived(poId, lines, porRows)) return null;
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
            const productsMap = await fetchProductsMap(base, lines.map(l => toNum(l.product_id)));
            const branchesMap = await fetchBranchesMap(base, lines.map(l => toNum(l.branch_id ?? 0)));
            const supplierMap = await fetchSupplierNames(base, [toNum(po.supplier_name)]);
            const porIdsByKey = buildPorIdsByKey(porRows);
            let discountPercent = pickNum(po, ["discount_percent", "discountPercent"]);
            const dType = po.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) discountPercent = calculateDiscountFromLines(dLines);
            else if (!discountPercent || discountPercent <= 0) discountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type || dType?.discount_code || dType?.name));
            if (!discountPercent) discountPercent = toNum(po.discount_percentage);
            const allocationsMap = new Map<number, POItem[]>();
            for (const ln of lines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(poId, pid, bid);
                const p = productsMap.get(pid);
                const pors = porIdsByKey.get(k) || [];
                const receivedQty = pors.reduce((sum, id) => sum + effectiveReceivedQty(porRows.find(r => toNum(r.purchase_order_product_id) === id)!), 0);
                const item: POItem = {
                    id: String(pors[0] || pid),
                    porId: String(pors[0] || ""),
                    productId: String(pid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: toNum(ln.ordered_quantity),
                    receivedQty,
                    requiresRfid: true,
                    taggedQty: taggedCountByKey.get(k) || 0,
                    rfids: rfidsByKey.get(k) || [],
                    isReceived: receivedQty >= toNum(ln.ordered_quantity),
                    unitPrice: toNum(ln.unit_price),
                    discountType: dType ? toStr(dType.discount_type || dType.discount_code || dType.name, "Standard") : "Standard",
                    discountAmount: toNum(ln.unit_price) * (discountPercent/100),
                    netAmount: receivedQty * (toNum(ln.unit_price) * (1 - discountPercent/100))
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
                const item: POItem = {
                    id: String(pors[0] || pid),
                    porId: String(pors[0] || ""),
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
                    unitPrice: toNum(p?.cost_per_unit || 0),
                    discountType: "Standard",
                    discountAmount: 0,
                    netAmount: receivedQty * toNum(p?.cost_per_unit || 0),
                    isExtra: true
                };
                const arr = allocationsMap.get(bid) ?? [];
                arr.push(item);
                allocationsMap.set(bid, arr);
            }
            const uniqueReceipts = Array.from(new Set(porRows.map(r => r.receipt_no).filter(Boolean)));
            const history = uniqueReceipts.map(rno => {
                const rowsForReceipt = porRows.filter(r => r.receipt_no === rno);
                return { receiptNo: rno, receiptDate: rowsForReceipt[0]?.receipt_date || rowsForReceipt[0]?.received_date || "", isPosted: rowsForReceipt.every(r => toNum(r.isPosted) === 1), itemsCount: rowsForReceipt.length };
            }).sort((a, b) => b.receiptNo!.localeCompare(a.receiptNo!));
            return ok({
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplier: { id: String(po.supplier_name), name: supplierMap.get(toNum(po.supplier_name)) || "Supplier Name" },
                status: receivingStatusFrom(poId, lines, porRows),
                allocations: Array.from(allocationsMap.entries()).map(([branchId, items]) => ({ branch: { id: String(branchId || "0"), name: branchesMap.get(branchId) || `Branch ${branchId}` }, items })),
                priceType: toStr(po.price_type, "General Receive Price"),
                createdAt: po.date_encoded ? new Date(po.date_encoded).toISOString() : new Date().toISOString(),
                history
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
             return ok({ status: "known", rfid: row.rfid_code, porId: String(row.purchase_order_product_id) });
        }
        if (action === "lookup_product") {
            const code = toStr(body.barcode).trim();
            if (!code) return bad("Missing barcode/SKU");
            const url = `${base}/items/${PRODUCTS_COLLECTION}?limit=1&filter[_or][0][barcode][_eq]=${encodeURIComponent(code)}&filter[_or][1][product_code][_eq]=${encodeURIComponent(code)}&fields=product_id,product_name,barcode,product_code,cost_per_unit,unit_of_measurement.*,unit_of_measurement_count`;
            const j = await fetchJson<{ data: ProductRow[] }>(url);
            const p = j?.data?.[0];
            if (!p) return bad("Product not found", 404);
            const uomId = Number(p.unit_of_measurement?.unit_id ?? p.unit_of_measurement);
            if (uomId !== 11) {
                return bad("Only products with 'Box' UOM are allowed.", 400);
            }

            return ok({
                productId: String(p.product_id),
                name: String(p.product_name),
                barcode: String(p.barcode || p.product_code),
                unitPrice: toNum(p.cost_per_unit) // Used for extra products
            });
        }

        // -------------------------
        // tag_and_receive — on-the-fly tagging + receiving (MERGED from tagging module)
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
             const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=discount_type.*,discount_type.line_per_discount_type.line_id.*`;
             const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
             const po = pj?.data;

             let discountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent", "discountPercent"]);
             const dType = po?.discount_type;
             const dLines = dType?.line_per_discount_type || [];
             if (dLines.length > 0) {
                 discountPercent = calculateDiscountFromLines(dLines);
             } else if (!discountPercent) {
                 discountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));
             }

             // Determine Base Unit Price depending on whether it's an Extra Item
             let unitPrice = 0;
             let discountTypeId = null;

             if (matchingLine) {
                 unitPrice = toNum(matchingLine.unit_price);
                 discountTypeId = matchingLine.discount_type
                     ? toNum(matchingLine.discount_type)
                     : (dType?.id ? toNum(dType.id) : null);
             } else {
                 // Extra Item -> fetch cost_per_unit from master table
                 const pUrl = `${base}/items/${PRODUCTS_COLLECTION}/${productId}?fields=cost_per_unit`;
                 const productJ = await fetchJson<{ data: ProductRow }>(pUrl);
                 unitPrice = toNum(productJ?.data?.cost_per_unit || 0);
                 // We can still apply the global PO discount if available
                 discountTypeId = dType?.id ? toNum(dType.id) : null;
             }

             // 1. Ensure receiving row exists (with accurate financial data)
             const ensured = await ensureOpenReceivingRow({
                 base,
                 poId,
                 productId,
                 branchId,
                 unitPrice,
                 discountTypeId,
                 discountPercent,
             });

             // 2. Insert RFID tag into receiving_items
             await fetchJson(`${base}/items/${POR_ITEMS_COLLECTION}`, {
                 method: "POST",
                 body: JSON.stringify({
                     purchase_order_product_id: ensured.porId,
                     product_id: productId,
                     rfid_code: rfid,
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

        // -------------------------
        // get_lots — fetch lots dropdown options
        // -------------------------
        if (action === "get_lots") {
            const url = `${base}/items/${LOTS_COLLECTION}?limit=-1&sort=lot_name&fields=lot_id,lot_name`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            return ok(j?.data ?? []);
        }

        // -------------------------
        // get_units — fetch units reference table
        // -------------------------
        if (action === "get_units") {
            const url = `${base}/items/${UNITS_COLLECTION}?limit=-1&sort=unit_name&fields=unit_id,unit_name,unit_shortcut`;
            const j = await fetchJson<{ data: Record<string, unknown>[] }>(url);
            return ok(j?.data ?? []);
        }

        // -------------------------
        // save_receipt — finalize a batch of scanned items
        // -------------------------
        if (action === "save_receipt") {
             const { items, receiptNo, receiptDate, porCounts, porMetaData, newTags } = body;
             const poId = toNum(body.poId);

             // 1. Process new tags if any
             if (Array.isArray(newTags) && newTags.length > 0 && poId) {
                 // Fetch PO once for discount calculations for new tags
                 const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=discount_type.*,discount_type.line_per_discount_type.line_id.*`;
                 const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
                 const po = pj?.data;
                 let poDiscountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent", "discountPercent"]);
                 const dType = po?.discount_type;
                 const dLines = dType?.line_per_discount_type || [];
                 if (dLines.length > 0) {
                     poDiscountPercent = calculateDiscountFromLines(dLines);
                 } else if (!poDiscountPercent) {
                     poDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));
                 }
                 const poLines = await fetchPOProductsByPOId(base, poId);
                 const porRows = await fetchPORByPOIds(base, [poId]);
                 const rItems = await fetchReceivingItemsByLinkIds(base, [...porRows.map(r => toNum(r.purchase_order_product_id)), ...poLines.map(l => toNum(l.purchase_order_product_id))]);
                 const { taggedCountByKey } = buildTagMapsForScopes({ poLines, porRows, receivingItems: rItems });

                 const processedRfids = new Set<string>();

                 for (const t of newTags) {
                     const rfid = normalizeRfid(toStr(t.rfid));
                     if (processedRfids.has(rfid)) continue; // Skip session duplicates
                     processedRfids.add(rfid);

                     const productId = toNum(t.productId);
                     const branchId = toNum(t.branchId);
                     const k = keyLine(poId, productId, branchId);

                     const matchingLine = poLines.find((ln: POProductRow) => toNum(ln.product_id) === productId && toNum(ln.branch_id ?? 0) === branchId);
                     
                     // ✅ Enforce Cap during Bulk Save
                     if (matchingLine) {
                         const current = taggedCountByKey.get(k) ?? 0;
                         if (current >= toNum(matchingLine.ordered_quantity)) continue; 
                         taggedCountByKey.set(k, current + 1); // increment for next loop
                     }
                     
                     let unitPrice = 0;
                     let discountTypeId = null;

                     if (matchingLine) {
                         unitPrice = toNum(matchingLine.unit_price);
                         discountTypeId = matchingLine.discount_type ? toNum(matchingLine.discount_type) : (dType?.id ? toNum(dType.id) : null);
                     } else {
                         const pUrl = `${base}/items/${PRODUCTS_COLLECTION}/${productId}?fields=cost_per_unit`;
                         const productJ = await fetchJson<{ data: ProductRow }>(pUrl);
                         unitPrice = toNum(productJ?.data?.cost_per_unit || 0);
                         discountTypeId = dType?.id ? toNum(dType.id) : null;
                     }

                     const ensured = await ensureOpenReceivingRow({
                         base,
                         poId,
                         productId,
                         branchId,
                         unitPrice,
                         discountTypeId,
                         discountPercent: poDiscountPercent,
                     });

                     await fetchJson(`${base}/items/${POR_ITEMS_COLLECTION}`, {
                         method: "POST",
                         body: JSON.stringify({
                             purchase_order_product_id: ensured.porId,
                             product_id: productId,
                             rfid_code: rfid,
                         }),
                     });
                     
                     // We need to patch porCounts mapping since the frontend didn't know the proper porId for the new tag!
                     // If it's an Extra Product, it might have metadata keyed by productId in the frontend.
                     if (porCounts && porCounts[productId]) {
                        porCounts[ensured.porId] = (porCounts[ensured.porId] || 0) + 1;
                        // Also copy metadata if it exists under productId
                        if (porMetaData && typeof porMetaData === "object" && porMetaData[productId]) {
                            porMetaData[ensured.porId] = porMetaData[productId];
                        }
                     }
                 }
             }

             // If using porCounts / porMetaData (new flow from provider)
             if (porCounts && typeof porCounts === "object") {
                 const meta = (porMetaData && typeof porMetaData === "object") ? porMetaData : {};
                 // Fetch PO once for discount calculations
                 const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=discount_type.*,discount_type.line_per_discount_type.line_id.*`;
                 const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
                 const po = pj?.data;
                 let poDiscountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent", "discountPercent"]);
                 const dType = po?.discount_type;
                 const dLines = dType?.line_per_discount_type || [];
                 if (dLines.length > 0) {
                     poDiscountPercent = calculateDiscountFromLines(dLines);
                 } else if (!poDiscountPercent) {
                     poDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));
                 }

                 for (const [porIdString, qtyNum] of Object.entries(porCounts)) {
                     const porId = porIdString;
                     const qty = toNum(qtyNum);
                     const m = meta[porId] || {};
                     
                     // We need to fetch the POR row to get the unit price if we want to be 100% accurate on totals
                     const porRowUrl = `${base}/items/${POR_COLLECTION}/${porId}?fields=unit_price,discount_type`;
                     const porRowJ = await fetchJson<{ data: PORow }>(porRowUrl).catch(() => null);
                     const pr = porRowJ?.data;
                     const uPrice = toNum(pr?.unit_price || 0);

                     // Re-calculate financials for this specific quantity
                     const dAmount = Number((uPrice * (poDiscountPercent / 100)).toFixed(2));
                     const nPrice = uPrice - dAmount;
                     const vAmount = Number((nPrice * 0.12).toFixed(2));
                     const wAmount = Number((nPrice * 0.01).toFixed(2));
                     const tAmount = Number((nPrice + vAmount).toFixed(2));

                     const patch: Record<string, unknown> = {
                         receipt_no: receiptNo,
                         receipt_date: receiptDate,
                         received_quantity: qty,
                         received_date: nowISO(),
                         isPosted: 0,
                         discounted_amount: Number((dAmount * qty).toFixed(2)),
                         vat_amount: Number((vAmount * qty).toFixed(2)),
                         withholding_amount: Number((wAmount * qty).toFixed(2)),
                         total_amount: Number((tAmount * qty).toFixed(2)),
                     };

                     if (m.lotId !== undefined && m.lotId !== null && m.lotId !== "") patch.lot_id = toNum(m.lotId);
                     if (m.batchNo !== undefined && m.batchNo !== null) patch.batch_no = String(m.batchNo).trim() || null;
                     if (m.expiryDate) patch.expiry_date = m.expiryDate;

                     await fetchJson(`${base}/items/${POR_COLLECTION}/${porId}`, {
                         method: "PATCH",
                         body: JSON.stringify(patch),
                     }).catch(() => {});
                 }
             } else {
                 // Legacy fallback: items array
                 for (const it of (items || [])) {
                     const qty = toNum(it.qty);
                     const m = (porMetaData && typeof porMetaData === "object") ? porMetaData[it.porId] : null;
                     
                     const patch: Record<string, unknown> = { 
                         receipt_no: receiptNo, 
                         receipt_date: receiptDate, 
                         received_quantity: qty, 
                         received_date: nowISO(), 
                         isPosted: 0
                     };

                     if (m) {
                         if (m.lotId) patch.lot_id = toNum(m.lotId);
                         if (m.batchNo) patch.batch_no = String(m.batchNo).trim() || null;
                         if (m.expiryDate) patch.expiry_date = m.expiryDate;
                     }

                     await fetchJson(`${base}/items/${POR_COLLECTION}/${it.porId}`, {
                         method: "PATCH",
                         body: JSON.stringify(patch)
                     }).catch(() => {});
                 }
             }

              // Refresh and return updated PO detail
              if (poId) {
                 const poUrl = `${base}/items/${PO_COLLECTION}/${poId}?fields=*,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
                 const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
                 const po = pj?.data;
                 if (po) {
                     const lines = await fetchPOProductsByPOId(base, poId);
                     const porRows = await fetchPORByPOIds(base, [poId]);
                     const receivingItems = await fetchReceivingItemsByLinkIds(base, [...porRows.map(r => toNum(r.purchase_order_product_id)), ...lines.map(l => toNum(l.purchase_order_product_id))]);
                     const { taggedCountByKey, rfidsByKey } = buildTagMapsForScopes({ poLines: lines, porRows, receivingItems });
                     const productsMap = await fetchProductsMap(base, lines.map(l => toNum(l.product_id)));
                     const branchesMap = await fetchBranchesMap(base, lines.map(l => toNum(l.branch_id ?? 0)));
                     const supplierMap = await fetchSupplierNames(base, [toNum(po.supplier_name)]);
                     const porIdsByKey = buildPorIdsByKey(porRows);

                     // ✅ Synchronize PO Header Status
                     const fully = isFullyReceived(poId, lines, porRows);
                     const hasReceipts = porRows.some((r) => toStr(r.receipt_no) || toStr(r.receipt_date) || toStr(r.received_date) || toNum(r.received_quantity) > 0);
                     const nextStatus = fully ? 13 : (hasReceipts ? 9 : po.inventory_status);
                     
                     // Only patch if we are truly upgrading the status
                     if (nextStatus === 13 || nextStatus === 9) {
                         await fetchJson(`${base}/items/${PO_COLLECTION}/${poId}`, {
                             method: "PATCH",
                             body: JSON.stringify({ inventory_status: nextStatus, date_received: nowISO() })
                         }).catch(() => {});
                     }

                     let discountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent", "discountPercent"]);
                     const dType = po.discount_type;
                     const dLines = dType?.line_per_discount_type || [];
                     if (dLines.length > 0) {
                         discountPercent = calculateDiscountFromLines(dLines);
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
                         const receivedQty = pors.reduce((sum, id) => {
                             const r = porRows.find(x => toNum(x.purchase_order_product_id) === id);
                             return sum + (r ? effectiveReceivedQty(r) : 0);
                         }, 0);
                         allocationsMap.set(bid, [...(allocationsMap.get(bid) ?? []), {
                             id: String(pors[0] || pid),
                             porId: String(pors[0] || ""),
                             productId: String(pid),
                             name: toStr(p?.product_name, `Product #${pid}`),
                             barcode: productDisplayCode(p, pid),
                              uom: "—",
                              uomCount: 1,
                              expectedQty: toNum(ln.ordered_quantity),
                             receivedQty,
                             requiresRfid: true,
                             taggedQty: taggedCountByKey.get(k) || 0,
                             rfids: rfidsByKey.get(k) || [],
                             isReceived: receivedQty >= toNum(ln.ordered_quantity),
                             unitPrice: toNum(ln.unit_price),
                             discountType: dType ? toStr(dType.discount_type || dType.discount_code || dType.name, "Standard") : "Standard",
                             discountAmount: toNum(ln.unit_price) * (discountPercent / 100),
                             netAmount: receivedQty * (toNum(ln.unit_price) * (1 - discountPercent / 100)),
                         }]);
                     }

                     const detail = {
                         id: String(poId),
                         poNumber: toStr(po.purchase_order_no),
                         supplier: { id: String(po.supplier_name), name: supplierMap.get(toNum(po.supplier_name)) || "Supplier" },
                         status: receivingStatusFrom(poId, lines, porRows),
                         allocations: Array.from(allocationsMap.entries()).map(([bid, items]) => ({
                             branch: { id: String(bid), name: branchesMap.get(bid) || "Unassigned" },
                             items,
                         })),
                     };
                     return ok({ ok: true, detail });
                 }
             }
             return ok({ ok: true });
        }

        return bad("Unknown action");
    } catch (e: unknown) { 
        return bad((e as Error).message, 500); 
    }
}