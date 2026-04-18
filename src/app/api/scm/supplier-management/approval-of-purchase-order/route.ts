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

/**
 * Robust relational calculation.
 * If multiple lines exist, they compound: 1 - Π(1 - pi/100)
 */
function calculateDiscountFromLines(lines: any[]): number {
    if (!lines?.length) return 0;
    const factor = lines.reduce((acc: number, line: any) => {
        const p = toNum(line?.line_id?.percentage ?? line?.percentage ?? 0);
        return acc * (1 - p / 100);
    }, 1);
    const total = (1 - factor) * 100;
    return Number(total.toFixed(4));
}

function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
    if (!nums.length) return 0;
    const factor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - factor) * 100).toFixed(4));
}

// =====================
// CONSTS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";
const UNITS_COLLECTION = "units";
const PRODUCT_SUPPLIER_COLLECTION = "product_per_supplier";

// optional env override (still supported)
const BRANCHES_COLLECTION = (process.env.BRANCHES_COLLECTION || "").trim();

// Directus system collection (works with admin/static token)
const DIRECTUS_RELATIONS_COLLECTION = "directus_relations";

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
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}
function uniqNums(arr: (number | string | null | undefined)[]) {
    return Array.from(new Set(arr.map((x) => toNum(x)).filter((n) => Number.isFinite(n) && n > 0)));
}
function pickNum(obj: Record<string, unknown> | null | undefined, keys: string[]) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
            const n = toNum(obj[k]);
            if (Number.isFinite(n)) return n;
        }
    }
    return 0;
}


// =====================
// MAPS
// =====================
async function fetchSuppliersMapByIds(base: string, supplierIds: number[]) {
    const map = new Map<number, { id: number; supplier_name: string }>();
    const ids = uniqNums(supplierIds);
    if (!ids.length) return map;

    // ✅ removed ap_balance (permission issue)
    const url =
        `${base}/items/${SUPPLIERS_COLLECTION}?limit=-1` +
        `&filter[id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=id,supplier_name`;

    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const s of j?.data ?? []) {
        const id = toNum(s?.id);
        if (!id) continue;
        map.set(id, { id, supplier_name: toStr(s?.supplier_name, "—") });
    }
    return map;
}

async function fetchProductsMapByIds(base: string, productIds: number[]) {
    const map = new Map<
        number,
        {
            product_id: number;
            product_name: string;
            barcode: string;
            product_code: string;
            unit_of_measurement: unknown;
            parent_id: number | null;
            category: string;
            brand: string;
        }
    >();
    const ids = uniqNums(productIds);
    if (!ids.length) return map;

    const url =
        `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=product_id,product_name,barcode,product_code,unit_of_measurement,parent_id,product_category,product_brand`;

    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const p of j?.data ?? []) {
        const id = toNum(p?.product_id ?? p?.id);
        if (!id) continue;
        map.set(id, {
            product_id: id,
            product_name: toStr(p?.product_name, `Product ${id}`),
            barcode: toStr(p?.barcode),
            product_code: toStr(p?.product_code),
            unit_of_measurement: p?.unit_of_measurement,
            parent_id: toNum(p?.parent_id) || null,
            category: toStr(p?.product_category),
            brand: toStr(p?.product_brand),
        });
    }
    return map;
}

async function fetchUnitsMapByIds(base: string, unitIds: (number | string | null | undefined)[]) {
    const map = new Map<number, { id: number; unit_shortcut: string }>();
    const ids = uniqNums(unitIds);
    if (!ids.length) return map;

    const url =
        `${base}/items/${UNITS_COLLECTION}?limit=-1` +
        `&filter[unit_id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=unit_id,unit_shortcut,unit_name`;

    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const u of j?.data ?? []) {
        const id = toNum(u?.unit_id);
        if (!id) continue;
        map.set(id, { id, unit_shortcut: toStr(u?.unit_shortcut, "—") });
    }
    return map;
}

async function fetchCategoriesMap(base: string, catIds: (number | string | null | undefined)[]) {
    const map = new Map<number, string>();
    const ids = uniqNums(catIds);
    if (!ids.length) return map;
    const url = `${base}/items/categories?limit=-1&filter[category_id][_in]=${encodeURIComponent(ids.join(","))}&fields=category_id,category_name`;
    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const c of j?.data ?? []) map.set(toNum(c.category_id), toStr(c.category_name));
    return map;
}

async function fetchBrandsMap(base: string, brandIds: (number | string | null | undefined)[]) {
    const map = new Map<number, string>();
    const ids = uniqNums(brandIds);
    if (!ids.length) return map;
    const url = `${base}/items/brand?limit=-1&filter[brand_id][_in]=${encodeURIComponent(ids.join(","))}&fields=brand_id,brand_name`;
    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const b of j?.data ?? []) map.set(toNum(b.brand_id), toStr(b.brand_name));
    return map;
}

// =====================
// BRANCH MAP (stronger: relation discovery + pk + label)
// =====================
async function discoverBranchCollection(base: string): Promise<string | ""> {
    // 1) env override
    if (BRANCHES_COLLECTION) return BRANCHES_COLLECTION;

    // 2) try Directus relations system table (best)
    try {
        const url =
            `${base}/items/${DIRECTUS_RELATIONS_COLLECTION}?limit=1` +
            `&filter[collection][_eq]=${encodeURIComponent(PO_PRODUCTS_COLLECTION)}` +
            `&filter[field][_eq]=branch_id` +
            `&fields=related_collection,collection,field`;

        const j = await fetchJson(url) as { data: Record<string, unknown>[] };
        const row = Array.isArray(j?.data) ? j.data[0] : null;
        const rel = toStr(row?.related_collection);
        if (rel) return rel;
    } catch {
        // ignore
    }

    // 3) fallback candidates
    return "";
}

async function tryFetchFieldsMeta(base: string, collection: string) {
    // Directus endpoint: /fields/{collection}
    // If not available in your instance/permissions, it will throw and we fallback.
    const url = `${base}/fields/${encodeURIComponent(collection)}`;
    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    return Array.isArray(j?.data) ? j.data : [];
}

function pickPrimaryKeyField(fieldsMeta: Record<string, unknown>[]): string {
    // prefer schema.is_primary_key
    for (const f of fieldsMeta) {
        const schema = f?.schema as Record<string, unknown> | null;
        if (schema?.is_primary_key) return toStr(f?.field);
    }
    // common fallbacks
    const candidates = ["id", "branch_id", "company_branch_id", "warehouse_id", "location_id"];
    for (const c of candidates) {
        if (fieldsMeta.some((f) => toStr(f?.field) === c)) return c;
    }
    return "id";
}

function pickLabelField(fieldsMeta: Record<string, unknown>[]): string[] {
    // Order matters. We return a list of label candidates to try.
    const labelCandidates = [
        "branch_name",
        "name",
        "division",
        "division_name",
        "department",
        "department_name",
        "type",
        "branch_type",
        "category",
        "label",
        "title",
        "description",
        "code",
    ];

    const existing = new Set(fieldsMeta.map((f) => toStr(f?.field)).filter(Boolean));
    const usable = labelCandidates.filter((x) => existing.has(x));
    // if nothing matches, still return common ones (querying unknown fields is ok ONLY if Directus ignores them;
    // but Directus usually errors on unknown fields, so we keep it safe: only existing)
    return usable.length ? usable : ["name", "branch_name"];
}

async function tryFetchBranchesByPk(
    base: string,
    collection: string,
    ids: number[],
    pk: string,
    labelFields: string[]
) {
    const safeIds = uniqNums(ids);
    if (!safeIds.length) return new Map<number, { id: number; name: string }>();

    // Build fields list safely
    const fields = [pk, ...labelFields].filter(Boolean).join(",");

    const url =
        `${base}/items/${collection}?limit=-1` +
        `&filter[${encodeURIComponent(pk)}][_in]=${encodeURIComponent(safeIds.join(","))}` +
        `&fields=${encodeURIComponent(fields)}`;

    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    const rows = Array.isArray(j?.data) ? j.data : [];

    const map = new Map<number, { id: number; name: string }>();
    for (const r of rows) {
        const id = toNum(r?.[pk] ?? r?.id ?? r?.branch_id);
        if (!id) continue;

        // pick best label from available fields
        let name = "";
        for (const lf of labelFields) {
            const v = toStr(r?.[lf]);
            if (v) {
                name = v;
                break;
            }
        }

        if (!name) {
            // broader fallback if labelFields are missing
            name =
                toStr(r?.branch_name) ||
                toStr(r?.name) ||
                toStr(r?.division_name) ||
                toStr(r?.division) ||
                toStr(r?.department_name) ||
                toStr(r?.department) ||
                toStr(r?.type) ||
                toStr(r?.branch_type) ||
                `Branch ${id}`;
        }

        map.set(id, { id, name });
    }

    return map;
}

async function fetchBranchesMapByIds(base: string, branchIds: number[]) {
    const ids = uniqNums(branchIds);
    const map = new Map<number, { id: number; name: string }>();
    if (!ids.length) return map;

    const discovered = await discoverBranchCollection(base);

    const candidates = [
        discovered,
        BRANCHES_COLLECTION,
        "branches",
        "branch",
        "company_branches",
        "company_branch",
        "branch_list",
        "branch_master",
        "delivery_branches",
        "delivery_branch",
        "warehouses",
        "warehouse",
        "locations",
        "location",
    ].filter(Boolean);

    for (const col of candidates) {
        try {
            const meta = await tryFetchFieldsMeta(base, col).catch(() => []);
            const pk = meta.length ? pickPrimaryKeyField(meta) : "id";
            const labelFields = meta.length ? pickLabelField(meta) : ["branch_name", "name"];

            const got = await tryFetchBranchesByPk(base, col, ids, pk, labelFields);

            // merge
            for (const [k, v] of got.entries()) map.set(k, v);

            if (map.size >= ids.length) return map;
        } catch {
            // ignore and try next
        }
    }

    return map;
}

function branchSummary(branchIds: number[], branchesMap: Map<number, { id: number; name: string }>) {
    const uniq = uniqNums(branchIds);
    if (!uniq.length) return { label: "—", id: "", name: "—" };

    if (uniq.length === 1) {
        const id = uniq[0];
        const name = branchesMap.get(id)?.name ?? `Branch ${id}`;
        return { label: name, id: String(id), name };
    }

    return { label: `Multiple (${uniq.length})`, id: "", name: `Multiple (${uniq.length})` };
}

// =====================
// FETCHERS
// =====================
type PoHeaderRow = {
    purchase_order_id: number;
    purchase_order_no?: string | null;
    date?: string | null;
    date_encoded?: string | null;
    supplier_name?: unknown;
    is_invoice?: boolean | number | null;
    isInvoice?: boolean | number | null;
    receiving_type?: number | null;
};

async function fetchPendingPOs(base: string): Promise<PoHeaderRow[]> {
    const fields = [
        "purchase_order_id",
        "purchase_order_no",
        "date",
        "supplier_name",
        "total_amount",
        "inventory_status",
        "payment_status",
        "approver_id",
        "date_approved",
        "receiving_type", // ✅ Persistent field for is_invoice (2=Invoice, 3=PO)
    ].join(",");

    const url = `${base}/items/${PO_COLLECTION}?limit=-1&sort=-date_encoded&fields=${fields}&filter[date_approved][_null]=true&filter[approver_id][_null]=true`;
    const j = await fetchJson(url) as { data: PoHeaderRow[] };
    return Array.isArray(j?.data) ? j.data : [];
}

type PoProductRow = {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    unit_price?: string | number | null;
    branch_id?: number | null;
    total_amount?: string | number | null;
    discounted_price?: string | number | null;
    approved_price?: string | number | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];

    // ✅ include unit_price (fixes blank price per item)
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}` +
        `&fields=*,product_id.*,branch_id.*`;

    const j = await fetchJson(url) as { data: PoProductRow[] };
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=*,product_id.*,branch_id.*`;

    const j = await fetchJson(url) as { data: PoProductRow[] };
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchDiscountTypesMap(base: string) {
    const map = new Map<string, { name: string; pct: number }>();
    try {
        const fields = encodeURIComponent("id,discount_type,total_percent,line_per_discount_type.line_id.*");
        const url = `${base}/items/discount_type?limit=-1&fields=${fields}`;
        const j = await fetchJson(url) as { data: any[] };
        for (const dt of (j?.data ?? [])) {
            const id = String(dt.id);
            const rawPct = toNum(dt.total_percent);
            const lines = dt.line_per_discount_type ?? [];
            
            let computed = 0;
            if (lines.length > 0) {
                computed = calculateDiscountFromLines(lines);
            } else if (rawPct > 0) {
                computed = rawPct;
            } else {
                computed = deriveDiscountPercentFromCode(toStr(dt.discount_type));
            }

            map.set(id, { name: toStr(dt.discount_type), pct: computed });
        }
    } catch (e: unknown) {
        const error = e as Error;
        console.error("[approval-po] Failed to fetch discount types:", error.message);
    }
    return map;
}

async function fetchProductSupplierLinks(base: string, productIds: number[]) {
    const map = new Map<number, { supplier_id: number; discount_type: unknown }>();
    const ids = uniqNums(productIds);
    if (!ids.length) return map;

    const url =
        `${base}/items/${PRODUCT_SUPPLIER_COLLECTION}?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=*`;

    const j = await fetchJson(url) as { data: Record<string, unknown>[] };
    for (const link of j?.data ?? []) {
        const pid = toNum(link?.product_id);
        if (!pid) continue;
        map.set(pid, {
            supplier_id: toNum(link?.supplier_id),
            discount_type: link?.discount_type,
        });
    }
    return map;
}

// =====================
// DETAIL BUILDER
// =====================
async function buildPurchaseOrderDetail(base: string, poId: number) {
    const fields = encodeURIComponent("*,discount_type.*,discount_type.line_per_discount_type.line_id.*");
    const headerUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}?fields=${fields}`;
    const headerJ = await fetchJson(headerUrl) as { data: Record<string, unknown> };
    const header = (headerJ?.data as Record<string, unknown>) ?? null;
    if (!header?.purchase_order_id) throw new Error("PO not found.");

    const poNumber = toStr(header?.purchase_order_no, String(poId));
    const date = toStr(header?.date ?? header?.date_encoded, "");
    const currency = (toStr(header?.currency, "PHP")) || "PHP";

    const supplierId = toNum(header?.supplier_name);
    const suppliersMap = await fetchSuppliersMapByIds(base, supplierId ? [supplierId] : []);
    const supplierLabels = new Map<number, string>();
    for (const [id, s] of suppliersMap) {
        supplierLabels.set(id, toStr(s?.supplier_name, "—"));
    }

    const supplierName = supplierId ? supplierLabels.get(supplierId) || "—" : "—";

    const lines = await fetchPOProductsByPOId(base, poId);

    const branchIds = uniqNums(lines.map((l) => l.branch_id));
    const branchesMap = await fetchBranchesMapByIds(base, branchIds);
    const bs = branchSummary(branchIds, branchesMap);

    const productIds = uniqNums(lines.map((l) => l.product_id));
    const productsMap = await fetchProductsMapByIds(base, productIds);

    const productsList = Array.from(productsMap.values());
    const catMap = await fetchCategoriesMap(base, productsList.map(p => p.category));
    const brandMap = await fetchBrandsMap(base, productsList.map(p => p.brand));

    const unitIds = uniqNums([
        ...lines.map((l: Record<string, unknown>) => l.unit_of_measurement as (string | number | null | undefined)),
        ...Array.from(productsMap.values()).map((p) => p.unit_of_measurement as (string | number | null | undefined)),
    ]);
    const unitsMap = await fetchUnitsMapByIds(base, unitIds);

    const productLinksMap = await fetchProductSupplierLinks(base, productIds);
    const discountMap = await fetchDiscountTypesMap(base);

    // ##### Helper to extract name/percent from expanded or ID lookup #####
    const getDiscInfo = (dtRaw: unknown) => {
        if (!dtRaw) return null;
        
        // 1) If it's an object with discount_type property (Directus expansion)
        if (typeof dtRaw === "object" && dtRaw !== null && "discount_type" in dtRaw) {
            const dt = dtRaw as Record<string, unknown>;
            return { name: toStr(dt.discount_type), pct: toNum(dt.total_percent) };
        }
        
        // 2) Try ID lookup (Robust fallback if expansion fails)
        const id = typeof dtRaw === "object" && dtRaw !== null ? String((dtRaw as { id: unknown }).id) : String(dtRaw);
        const info = discountMap.get(id);
        if (info) return info;

        return null;
    };

    // Helper to format a label if name is missing but pct exists
    const formatDiscLabel = (info: { name: string; pct: number } | null, fallbackName: string) => {
        const p = info?.pct ?? 0;
        const roundedP = Math.round(p * 10000) / 10000;

        // Magic resolves from percentages
        if (roundedP === 8) return "L8";
        if (Math.abs(roundedP - 9.5617) < 0.01) return "ACE Promo1";
        if (roundedP === 75.4975) return "ACE Promo";

        if (info?.name) return info.name;
        if (info?.pct) {
            // Try to find a named discount in the map that matches this percentage
            for (const d of discountMap.values()) {
                if (d.name && Math.abs(d.pct - info.pct) < 0.001) {
                    return d.name;
                }
            }
            const pVal = Number(info.pct.toFixed(2));
            return `${pVal}% DISCOUNT`;
        }
        return fallbackName;
    };

    // ===== Pre-calculate Header Financials for Fallback =====
    const tempItems = lines.map((l) => {
        const qty = Math.max(0, toNum(l.ordered_quantity));
        const unit = toNum(l.unit_price);
        return { lineTotal: qty * unit };
    });
    const grossComputed = tempItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const grossHeader = pickNum(header, ["gross_amount", "grossAmount", "subtotal", "sub_total"]);
    const headerGross = grossHeader || grossComputed;

    let headerDiscAmount = pickNum(header, ["discounted_amount", "discount_amount", "discountAmount", "discount_value", "discountValue"]);
    let headerDiscPct = pickNum(header, ["discount_percent", "discountPercent", "discount_rate", "discountRate", "discount_percentage", "discountPercentage"]);

    if (!headerDiscAmount && headerDiscPct > 0 && headerGross > 0) {
        headerDiscAmount = (headerGross * headerDiscPct) / 100;
    }
    if (!headerDiscPct && headerDiscAmount > 0 && headerGross > 0) {
        headerDiscPct = (headerDiscAmount / headerGross) * 100;
    }

    const headerDiscRaw = header?.discount_type;
    const headerDiscInfo = getDiscInfo(headerDiscRaw);

    const effectiveHeaderDisc = headerDiscInfo || (headerDiscPct > 0 ? { name: "", pct: headerDiscPct } : null);
    const headerDiscTypeName = formatDiscLabel(
        effectiveHeaderDisc, 
        headerDiscAmount > 0 ? (headerDiscPct ? `${Number(headerDiscPct.toFixed(2))}% DISCOUNT` : "PO Discount") : ""
    );

    const items = lines.map((l) => {
        const pid = toNum(l.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const qty = Math.max(0, toNum(l.ordered_quantity));
        const unit = toNum(l.unit_price);
        const lineTotal = qty * unit;

        const barcode = toStr(p?.barcode) || toStr(p?.product_code) || (pid ? String(pid) : "");
        const name = toStr(p?.product_name, `Product #${pid || l.product_id}`);

        const linkData = productLinksMap.get(pid);
        
        const itemDisc = getDiscInfo((l as Record<string, unknown>).discount_type);
        const linkDisc = getDiscInfo(linkData?.discount_type);
        const headerDiscPct = pickNum(header, ["discount_percent", "discountPercent", "discount_rate", "discountRate", "discount_percentage", "discountPercentage"]);

        const resolvedDiscountType = formatDiscLabel(itemDisc, formatDiscLabel(linkDisc, headerDiscTypeName)) || "—";
        const discountPct = itemDisc?.pct || linkDisc?.pct || headerDiscPct || 0;

        const grossVal = toNum((l as Record<string, unknown>).gross) || lineTotal;
        let netVal = toNum(l.total_amount) || toNum((l as Record<string, unknown>).net) || 0;
        
        // Calculate net if missing or if it matches gross (fallback to header discount)
        if ((netVal === 0 || netVal === grossVal) && discountPct > 0) {
            netVal = grossVal * (1 - discountPct / 100);
        } else if (netVal === 0) {
            netVal = grossVal;
        }

        const discAmt = Math.max(0, grossVal - netVal);

        return {
            id: String(l.purchase_order_product_id),
            purchase_order_product_id: l.purchase_order_product_id,
            product_id: pid,
            productId: String(pid || ""),
            name,
            barcode,
            brand: brandMap.get(toNum(p?.brand)) || "—",
            category: catMap.get(toNum(p?.category)) || "—",
            uom:
                unitsMap.get(toNum((l as Record<string, unknown>)?.unit_of_measurement))?.unit_shortcut ||
                unitsMap.get(toNum(p?.unit_of_measurement))?.unit_shortcut ||
                toStr((l as Record<string, unknown>)?.unit_of_measurement) ||
                toStr(p?.unit_of_measurement) ||
                "—",

            // Link supplier info if parent_id is null
            link_supplier_id: p?.parent_id === null ? linkData?.supplier_id || null : null,
            link_discount_type: resolvedDiscountType !== "—" ? resolvedDiscountType : null,

            ordered_quantity: qty,
            expectedQty: qty,
            qty,
            quantity: qty,

            unit_price: unit,
            unitPrice: unit,
            price: unit,

            gross: grossVal,
            discount_type: resolvedDiscountType,
            discount_amount: discAmt,
            net: netVal,

            line_total: netVal,
            lineTotal: netVal,

            branch_id: toNum(l.branch_id),
        };
    });

    const allocationsMap = new Map<number, { branch: { id: string; name: string }; items: unknown[] }>();
    for (const it of items) {
        const bid = toNum(it.branch_id);
        if (!bid) continue;
        if (!allocationsMap.has(bid)) {
            allocationsMap.set(bid, {
                branch: { id: String(bid), name: branchesMap.get(bid)?.name ?? `Branch ${bid}` },
                items: [],
            });
        }
        allocationsMap.get(bid)!.items.push(it);
    }
    const allocations = Array.from(allocationsMap.values());

    // ===== Final Financials for View =====
    const vatHeader = pickNum(header, ["vat_amount", "vatAmount", "vat"]);
    const ewtHeader = pickNum(header, ["withholding_tax_amount", "withholdingAmount", "ewt_amount", "ewtGoods"]);
    const totalHeader = pickNum(header, ["total_amount", "totalAmount", "total"]);

    const vat = vatHeader || (headerGross - headerDiscAmount) * 0.12;
    const ewt = ewtHeader || 0;
    const total = totalHeader || headerGross - headerDiscAmount + vat - ewt;

    return {
        id: String(poId),
        purchase_order_id: poId,
        purchase_order_no: poNumber,
        poNumber,
        date,
        currency,

        supplierId,
        supplierName,
        supplier: { id: String(supplierId || ""), name: supplierName },

        branchName: bs.label,
        branch_name: bs.label,
        branch: { id: bs.id, name: bs.name },

        items,
        allocations,

        gross_amount: headerGross,
        grossAmount: headerGross,

        discounted_amount: headerDiscAmount,
        discountAmount: headerDiscAmount,

        discount_percent: headerDiscPct,
        discountPercent: headerDiscPct,

        discount_type: headerDiscTypeName,
        discountType: headerDiscTypeName,
        
        // derives is_invoice from receiving_type (2=Invoice, 3=PO) (robust check)
        is_invoice: (Number(header?.receiving_type) === 2) || (String(header?.is_invoice ?? header?.isInvoice).toLowerCase() === "true") || !!(header?.is_invoice ?? header?.isInvoice),

        vat_amount: vat,
        vatAmount: vat,

        withholding_tax_amount: ewt,
        ewtGoods: ewt,

        total_amount: total,
        total: total,
    };
}

// =====================
// ROUTE HANDLERS
// =====================
export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const id = req.nextUrl.searchParams.get("id");

        if (id) {
            const poId = toNum(id);
            if (!poId) return bad("Invalid id.", 400);
            const detail = await buildPurchaseOrderDetail(base, poId);
            return ok(detail);
        }

        const headers = await fetchPendingPOs(base);
        const poIds = uniqNums(headers.map((h) => h.purchase_order_id));
        const lines = await fetchPOProductsByPOIds(base, poIds);

        const totalByPo = new Map<number, number>();
        const qtyByPo = new Map<number, number>();
        const branchesByPo = new Map<number, Set<number>>();

        for (const l of lines) {
            const poId = toNum(l.purchase_order_id);
            if (!poId) continue;

            const qty = Math.max(0, toNum(l.ordered_quantity));
            const price = toNum(l.unit_price);

            qtyByPo.set(poId, (qtyByPo.get(poId) ?? 0) + qty);
            totalByPo.set(poId, (totalByPo.get(poId) ?? 0) + qty * price);

            const bid = toNum(l.branch_id);
            if (!branchesByPo.has(poId)) branchesByPo.set(poId, new Set<number>());
            if (bid) branchesByPo.get(poId)!.add(bid);
        }

        const allBranchIds: number[] = [];
        for (const set of branchesByPo.values()) for (const bid of set.values()) allBranchIds.push(bid);
        const branchesMap = await fetchBranchesMapByIds(base, allBranchIds);

        const supplierIds = uniqNums(headers.map((h) => h.supplier_name as string | number | null | undefined));
        const suppliersMap = await fetchSuppliersMapByIds(base, supplierIds);

        const list = headers.map((h) => {
            const poId = toNum(h.purchase_order_id);
            const sid = toNum(h.supplier_name);

            const bset = branchesByPo.get(poId);
            const branchIds = bset ? Array.from(bset.values()) : [];
            const bs = branchSummary(branchIds, branchesMap);

            return {
                id: String(poId),
                purchase_order_id: poId,
                purchase_order_no: toStr(h.purchase_order_no, String(poId)),
                poNumber: toStr(h.purchase_order_no, String(poId)),
                date: toStr(h.date ?? h.date_encoded, "—"),

                supplierId: sid,
                supplierName: sid ? toStr(suppliersMap.get(sid)?.supplier_name, "—") : "—",

                branchName: bs.label,
                branch_name: bs.label,
                branch: bs.label,

                itemsCount: qtyByPo.get(poId) ?? 0,
                branchesCount: bset?.size ?? 0,

                totalAmount: totalByPo.get(poId) ?? 0,
                currency: "PHP",
                // derives is_invoice from receiving_type (2=Invoice, 3=PO) (robust check)
                is_invoice: (Number(h.receiving_type) === 2) || (String(h.is_invoice ?? h.isInvoice).toLowerCase() === "true") || !!(h.is_invoice ?? h.isInvoice),
            };
        });

        return ok(list);
    } catch (e: unknown) {
        const error = e as Error;
        return bad(String(error?.message ?? error ?? "Failed to load approval POs"), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));

        const id = toStr(body?.id);
        if (!id) return bad("Missing id.", 400);

        const poId = toNum(id);
        if (!poId) return bad("Invalid id.", 400);

        const patch: Record<string, unknown> = { 
            date_approved: new Date().toISOString(),
            receiving_type: Boolean(body?.markAsInvoice) ? 2 : 3, // Persistent flag for "Mark as Invoice"
            inventory_status: 3 // ✅ For Receiving
        };
        if (Boolean(body?.markAsInvoice)) patch.payment_status = 2;

        const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
        await fetchJson(url, { method: "PATCH", body: JSON.stringify(patch) });

        return ok({ ok: true });
    } catch (e: unknown) {
        const error = e as Error;
        return bad(String(error?.message ?? error ?? "Failed to approve PO"), 400);
    }
}
