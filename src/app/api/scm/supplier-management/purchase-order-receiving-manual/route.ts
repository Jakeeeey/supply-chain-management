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
function ok(data: unknown, status = 200) { return NextResponse.json({ data }, { status }); }
function bad(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
function toStr(v: unknown, fb = "") { const s = String(v ?? "").trim(); return s ? s : fb; }
function toNum(v: unknown) { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function pickNum(obj: Record<string, unknown> | null | undefined, keys: string[]) {
    for (const k of keys) if (obj?.[k]) { const n = toNum(obj[k]); if (n) return n; }
    return 0;
}
function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n > 0 && n <= 100);
    if (!nums.length) return 0;
    const f = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - f) * 100).toFixed(4));
}
function keyLine(poId: number, productId: number, branchId: number) { return `${poId}::${productId}::${branchId}`; }
function nowISO() { return new Date().toISOString(); }
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

const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const BRANCHES_COLLECTION = "branches";
const POR_COLLECTION = "purchase_order_receiving";
const LOTS_COLLECTION = "lots";
const UNITS_COLLECTION = "units";

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

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

function productDisplayCode(p: ProductRow | null | undefined, productId: number) {
    const pc = toStr(p?.product_code);
    const bc = toStr(p?.barcode);
    if (pc && bc && pc !== bc) return `${pc} (${bc})`;
    return pc || bc || String(productId);
}

function effectiveReceivedQty(por: PORow | null | undefined) {
    const posted = toNum(por?.isPosted) === 1;
    if (posted) return Math.max(0, toNum(por?.received_quantity ?? 0));
    const evidence = Boolean(toStr(por?.receipt_no) || toStr(por?.receipt_date) || toStr(por?.received_date));
    if (!evidence) return 0;
    return Math.max(0, toNum(por?.received_quantity ?? 0));
}

async function fetchSupplierNames(base: string, supplierIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(supplierIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,supplier_name`;
        const j = await fetchJson<{ data: Array<{id: string | number; supplier_name: string}> }>(url);
        for (const s of (j?.data ?? [])) map.set(toNum(s.id), toStr(s.supplier_name, "—"));
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

async function fetchBranchesMap(base: string, branchIds: number[]) {
    const map = new Map<number, string>();
    const uniq = Array.from(new Set(branchIds.filter((n) => n > 0)));
    if (!uniq.length) return map;
    for (const ids of chunk(uniq, 250)) {
        const url = `${base}/items/${BRANCHES_COLLECTION}?limit=-1&filter[id][_in]=${encodeURIComponent(ids.join(","))}&fields=id,branch_name,branch_description`;
        const j = await fetchJson<{ data: Array<{id: string | number; branch_name: string; branch_description: string}> }>(url);
        for (const b of (j?.data ?? [])) map.set(toNum(b.id), toStr(b.branch_name) || toStr(b.branch_description) || `Branch ${b.id}`);
    }
    return map;
}

async function fetchPORByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PORow[];
    const rows: PORow[] = [];
    for (const ids of chunk(Array.from(new Set(poIds)), 250)) {
        const url = `${base}/items/${POR_COLLECTION}?limit=-1&filter[purchase_order_id][_in]=${encodeURIComponent(ids.join(","))}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,received_quantity,receipt_no,receipt_date,received_date,isPosted,lot_id,batch_no,expiry_date`;
        const j = await fetchJson<{ data: PORow[] }>(url);
        rows.push(...(j?.data ?? []));
    }
    return rows;
}

async function fetchPOProductsByPOId(base: string, poId: number): Promise<POProductRow[]> {
    const url = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}&fields=purchase_order_product_id,purchase_order_id,product_id,branch_id,ordered_quantity,unit_price,total_amount`;
    const j = await fetchJson<{ data: POProductRow[] }>(url);
    return (j?.data ?? []);
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

function receivingStatusFrom(poId: number, lines: POProductRow[], porRows: PORow[]): "OPEN" | "PARTIAL" | "CLOSED" {
    const fully = isFullyReceived(poId, lines, porRows);
    if (fully) return "CLOSED";
    
    const hasAnyPosted = porRows.some(r => toNum(r.isPosted) === 1);
    const hasAnyReceipt = porRows.some(r => effectiveReceivedQty(r) > 0 || toStr(r.receipt_no));
    
    if (hasAnyPosted || hasAnyReceipt) return "PARTIAL";
    return "OPEN";
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

// =====================
// ENSURE RECEIVING ROW (For Extra items)
// =====================
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

    // Check if an unposted row already exists for this PO/product/branch
    const findUrl =
        `${base}/items/${POR_COLLECTION}?limit=1` +
        `&sort=-purchase_order_product_id` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&filter[product_id][_eq]=${encodeURIComponent(String(productId))}` +
        `&filter[branch_id][_eq]=${encodeURIComponent(String(branchId))}` +
        `&filter[isPosted][_eq]=0` +
        `&fields=purchase_order_product_id,received_quantity,receipt_no`;

    const found = await fetchJson<{ data: Record<string, unknown>[] }>(findUrl);
    const row = Array.isArray(found?.data) ? found.data[0] : null;
    if (row?.purchase_order_product_id) {
        return {
            porId: toNum(row.purchase_order_product_id),
            receivedQty: toNum(row.received_quantity),
            created: false,
        };
    }

    // Calculate financial fields
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
        isPosted: 0, // Unposted placeholder until save
        receipt_no: null,
        receipt_date: null,
        received_date: null,
    };

    const created = await fetchJson<{ data: Record<string, unknown> }>(insertUrl, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    const porId = toNum(created?.data?.purchase_order_product_id);
    if (!porId) {
        throw new Error("Failed to create purchase_order_receiving row.");
    }

    return { porId, receivedQty: 0, created: true };
}

// =====================
// EXPORTS
// =====================
export async function GET() {
    try {
        const base = getDirectusBase();
        const poHeaders = await fetchApprovedNotReceivedPOs(base);
        const poIds = poHeaders.map((p: POHeaderRow) => toNum(p.purchase_order_id)).filter(Boolean);
        if (!poIds.length) return ok([]);

        const urlLines = `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1&fields=purchase_order_id,product_id,branch_id,ordered_quantity,purchase_order_product_id&filter[purchase_order_id][_in]=${poIds.join(",")}`;
        const jl = await fetchJson<{ data: POProductRow[] }>(urlLines);
        const poLinesAll = jl?.data ?? [];

        const porRowsAll = await fetchPORByPOIds(base, poIds);
        const supplierMap = await fetchSupplierNames(base, poHeaders.map((p: POHeaderRow) => toNum(p.supplier_name)));

        const list = poHeaders.map((po: POHeaderRow) => {
            const poId = toNum(po.purchase_order_id);
            const lines = poLinesAll.filter((l: POProductRow) => toNum(l.purchase_order_id) === poId);
            const porRows = porRowsAll.filter((r: PORow) => toNum(r.purchase_order_id) === poId);

            if (isFullyReceived(poId, lines, porRows)) return null;

            return {
                id: String(poId),
                poNumber: toStr(po.purchase_order_no),
                supplierName: supplierMap.get(toNum(po.supplier_name)) || "—",
                status: receivingStatusFrom(poId, lines, porRows),
                totalAmount: toNum(po.total_amount),
                currency: "PHP",
                itemsCount: new Set(lines.map((l: POProductRow) => l.product_id)).size,
                branchesCount: new Set(lines.map((l: POProductRow) => l.branch_id)).size,
                priceType: toStr(po.price_type, "General Receive Price")
            };
        }).filter(Boolean);

        return ok(list);
    } catch (e: unknown) { 
        const error = e as Error;
        return bad(error.message, 500); 
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));
        const action = toStr(body.action);

        if (action === "open_po" || action === "verify_po") {
            const poId = toNum(body.poId);
            const barcode = toStr(body.barcode);
            
            // Allow looking up by Barcode too
            let thePoId = poId;
            if (!thePoId && barcode) {
                const bUrl = `${base}/items/${PO_COLLECTION}?limit=1&filter[purchase_order_no][_eq]=${encodeURIComponent(barcode)}&fields=purchase_order_id`;
                const bj = await fetchJson<{ data: Array<{purchase_order_id: string | number}> }>(bUrl);
                thePoId = toNum(bj?.data?.[0]?.purchase_order_id);
            }

            if (!thePoId) return bad("Missing PO ID or Barcode");

            const poUrl = `${base}/items/${PO_COLLECTION}/${thePoId}?fields=*,discount_type.*,discount_type.line_per_discount_type.line_id.*`;
            const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
            const po = pj?.data;
            if (!po) return bad("PO not found", 404);

            const priceType = toStr(po.price_type, "General Receive Price");
            const lines = await fetchPOProductsByPOId(base, thePoId);
            const porRows = await fetchPORByPOIds(base, [thePoId]);
            const productsMap = await fetchProductsMap(base, lines.map((l: POProductRow) => toNum(l.product_id)));
            const branchesMap = await fetchBranchesMap(base, lines.map((l: POProductRow) => toNum(l.branch_id ?? 0)));
            const supplierMap = await fetchSupplierNames(base, [toNum(po.supplier_name)]);
            const porIdsByKey = buildPorIdsByKey(porRows);

            let discountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent"]);
            const dType = po.discount_type;
            const dLines = dType?.line_per_discount_type || [];
            if (dLines.length > 0) {
                discountPercent = calculateDiscountFromLines(dLines);
            } else if (!discountPercent || discountPercent <= 0) {
                discountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type || dType?.discount_code || dType?.name));
            }
            if (!discountPercent) discountPercent = toNum(po.discount_percentage);

            const allocationsMap = new Map<number, Record<string, unknown>[]>();
            for (const ln of lines) {
                const pid = toNum(ln.product_id);
                const bid = toNum(ln.branch_id ?? 0);
                const k = keyLine(thePoId, pid, bid);
                const p = productsMap.get(pid);
                const pors = porIdsByKey.get(k) || [];
                const receivedQty = pors.reduce((sum, id) => {
                    const r = porRows.find(x => toNum(x.purchase_order_product_id) === id);
                    return sum + effectiveReceivedQty(r);
                }, 0);
                
                const item = {
                    id: pors[0] ? String(pors[0]) : `${pid}-${bid}`,
                    porId: String(pors[0] || ""),
                    productId: String(pid),
                    branchId: String(bid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: toNum(ln.ordered_quantity),
                    receivedQty,
                    requiresRfid: true, // Legacy flag logic
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

            // EXTRA ITEMS Check
            const lineKeys = new Set(lines.map((l: POProductRow) => keyLine(thePoId, toNum(l.product_id), toNum(l.branch_id ?? 0))));
            const extraPorRows = porRows.filter(r => !lineKeys.has(keyLine(thePoId, toNum(r.product_id), toNum(r.branch_id ?? 0))));
            const extraKeys = Array.from(new Set(extraPorRows.map(r => keyLine(thePoId, toNum(r.product_id), toNum(r.branch_id ?? 0)))));

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
                const receivedQty = pors.reduce((sum, id) => {
                    const r = porRows.find(x => toNum(x.purchase_order_product_id) === id);
                    return sum + effectiveReceivedQty(r);
                }, 0);

                const item = {
                    id: pors[0] ? String(pors[0]) : `${pid}-${bid}`,
                    porId: String(pors[0] || ""),
                    productId: String(pid),
                    branchId: String(bid),
                    name: toStr(p?.product_name, `Product #${pid}`),
                    barcode: productDisplayCode(p, pid),
                    uom: String(p?.unit_of_measurement?.unit_shortcut ?? p?.unit_of_measurement?.unit_name ?? "BOX").toUpperCase(),
                    uomCount: Number(p?.unit_of_measurement_count) || 1,
                    expectedQty: 0,
                    receivedQty,
                    requiresRfid: true,
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
                return {
                    receiptNo: rno,
                    receiptDate: rowsForReceipt[0]?.receipt_date || rowsForReceipt[0]?.received_date || "",
                    isPosted: rowsForReceipt.every(r => toNum(r.isPosted) === 1),
                    itemsCount: rowsForReceipt.length
                };
            }).sort((a, b) => (b.receiptNo || "").localeCompare(a.receiptNo || ""));

            return ok({
                id: String(thePoId),
                poNumber: toStr(po.purchase_order_no),
                supplier: { id: String(po.supplier_name), name: supplierMap.get(toNum(po.supplier_name)) || "Supplier" },
                status: receivingStatusFrom(thePoId, lines, porRows),
                allocations: Array.from(allocationsMap.entries()).map(([branchId, items]) => ({
                    branch: { id: String(branchId || "0"), name: branchesMap.get(branchId) || `Branch ${branchId}` },
                    items
                })),
                priceType,
                createdAt: po.date_encoded ? new Date(po.date_encoded).toISOString() : new Date().toISOString(),
                history
            });
        }

        // -------------------------
        // lookup_product
        // -------------------------
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
                unitPrice: toNum(p.cost_per_unit)
            });
        }

        // -------------------------
        // get_lots & get_units
        // -------------------------
        if (action === "get_lots") {
            const url = `${base}/items/${LOTS_COLLECTION}?limit=-1&sort=lot_name&fields=lot_id,lot_name`;
            const j = await fetchJson<{ data: Array<{lot_id: string | number; lot_name: string}> }>(url);
            return ok(j?.data ?? []);
        }
        if (action === "get_units") {
            const url = `${base}/items/${UNITS_COLLECTION}?limit=-1&sort=unit_name&fields=unit_id,unit_name,unit_shortcut`;
            const j = await fetchJson<{ data: Array<{unit_id: string | number; unit_name: string; unit_shortcut: string}> }>(url);
            return ok(j?.data ?? []);
        }

        // -------------------------
        // save_receipt
        // -------------------------
        if (action === "save_receipt") {
             const { poId, receiptNo, receiptDate, porCounts, porMetaData } = body;
             const thePoId = toNum(poId);
             
             if (!thePoId) return bad("Missing PO ID");

             // For Manual Receiving, porCounts looks like { "porId_or_productId": 10 }
             // and porMetaData looks like { "porId_or_productId": { lotNo: "1", expiryDate: "2024-01-01" } }

             const poUrl = `${base}/items/${PO_COLLECTION}/${thePoId}?fields=discount_type.*,discount_type.line_per_discount_type.line_id.*`;
             const pj = await fetchJson<{ data: POHeaderRow }>(poUrl);
             const po = pj?.data;
             let poDiscountPercent = pickNum(po as unknown as Record<string, unknown>, ["discount_percent"]);
             const dType = po?.discount_type;
             const dLines = dType?.line_per_discount_type || [];
             if (dLines.length > 0) poDiscountPercent = calculateDiscountFromLines(dLines);
             else if (!poDiscountPercent) poDiscountPercent = deriveDiscountPercentFromCode(toStr(dType?.discount_type));

             const lines = await fetchPOProductsByPOId(base, thePoId);
             // REMOVED: unused branchIdAssigned usage here

             // Translate productId keys into porId keys (create POR if Extra Product)
             for (const [key, qtyNum] of Object.entries(porCounts)) {
                 const qty = toNum(qtyNum);
                 if (qty <= 0) continue;

                 // If key is a placeholder productId-branchId (no matching POR row ID yet)
                 if (String(key).includes("-")) { 
                     const [pidStr, bidStr] = key.split("-");
                     const productId = toNum(pidStr);
                     const branchIdTarget = toNum(bidStr);
                     
                     // check if POR row already exists for this productId in this PO and branch
                     const matchingLine = lines.find((l: POProductRow) => toNum(l.product_id) === productId && toNum(l.branch_id) === branchIdTarget);
                     
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
                         base, poId: thePoId, productId, branchId: branchIdTarget,
                         unitPrice, discountTypeId, discountPercent: poDiscountPercent
                     });

                     // Ensure we use the proper porId below
                     if (String(ensured.porId) !== key) {
                        porCounts[String(ensured.porId)] = qty;
                        delete porCounts[key];
                        if (porMetaData && porMetaData[key]) {
                            porMetaData[String(ensured.porId)] = porMetaData[key];
                        }
                     }
                 }
             }

             const meta = (porMetaData && typeof porMetaData === "object") ? porMetaData : {};
             
             // Update POR rows with quantities and financial details
             for (const [porIdString, qtyNum] of Object.entries(porCounts)) {
                 const porId = porIdString;
                 const qty = toNum(qtyNum);
                 if (qty <= 0) continue;
                 const m = meta[porId] || {};
                 
                 const porRowUrl = `${base}/items/${POR_COLLECTION}/${porId}?fields=unit_price,discount_type,received_quantity`;
                 const porRowJ = await fetchJson<{ data: PORow }>(porRowUrl).catch(() => null);
                 const pr = porRowJ?.data;
                 const uPrice = toNum(pr?.unit_price || 0);

                 // Compute Financials
                 const dAmount = Number((uPrice * (poDiscountPercent / 100)).toFixed(2));
                 const nPrice = uPrice - dAmount;
                 const vAmount = Number((nPrice * 0.12).toFixed(2));
                 const wAmount = Number((nPrice * 0.01).toFixed(2));
                 const tAmount = Number((nPrice + vAmount).toFixed(2));

                 const newQty = toNum(pr?.received_quantity || 0) + qty;

                 const patch: Record<string, unknown> = {
                     receipt_no: receiptNo,
                     receipt_date: receiptDate,
                     received_quantity: newQty,
                     received_date: nowISO(),
                     isPosted: 0,
                     discount_type: dType?.id ? toNum(dType.id) : null,
                     discounted_amount: Number((dAmount * newQty).toFixed(2)),
                     vat_amount: Number((vAmount * newQty).toFixed(2)),
                     withholding_amount: Number((wAmount * newQty).toFixed(2)),
                     total_amount: Number((tAmount * newQty).toFixed(2)),
                 };

                 if (m.lotNo !== undefined && m.lotNo !== null && m.lotNo !== "") patch.lot_id = toNum(m.lotNo);
                 if (m.batchNo) patch.batch_no = toStr(m.batchNo);
                 if (m.expiryDate) patch.expiry_date = m.expiryDate;

                 await fetchJson(`${base}/items/${POR_COLLECTION}/${porId}`, {
                     method: "PATCH",
                     body: JSON.stringify(patch),
                 }).catch(() => {});
             }

             // Refresh data to evaluate status
             const finalLines = await fetchPOProductsByPOId(base, thePoId);
             const finalPorRows = await fetchPORByPOIds(base, [thePoId]);

             const fully = isFullyReceived(thePoId, finalLines, finalPorRows);
             const hasReceipts = finalPorRows.some((r) => toStr(r.receipt_no) || toStr(r.receipt_date) || toStr(r.received_date) || toNum(r.received_quantity) > 0);
             
             // 13 = FOR POSTING, 9 = PARTIALLY RECEIVED
             const nextStatus = fully ? 13 : (hasReceipts ? 9 : po.inventory_status);
             
             if (nextStatus === 13 || nextStatus === 9) {
                 await fetchJson(`${base}/items/${PO_COLLECTION}/${thePoId}`, {
                     method: "PATCH",
                     body: JSON.stringify({ inventory_status: nextStatus, date_received: nowISO() })
                 }).catch(() => {});
             }

             // Return updated detail (optional, but typical for frontend refresh)
             return ok({ ok: true });
        }

        return bad("Unknown action");
    } catch (e: unknown) { 
        const error = e as Error;
        return bad(error.message, 500); 
    }
}
