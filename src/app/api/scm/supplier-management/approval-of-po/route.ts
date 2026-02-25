// src/app/api/scm/supplier-management/approval-of-po/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusFetch as fetchJson } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// CONSTS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";

// optional env override (still supported)
const BRANCHES_COLLECTION = (process.env.BRANCHES_COLLECTION || "").trim();

// Directus system collection (works with admin/static token)
const DIRECTUS_RELATIONS_COLLECTION = "directus_relations";

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
function uniqNums(arr: any[]) {
    return Array.from(new Set(arr.map((x) => toNum(x)).filter((n) => Number.isFinite(n) && n > 0)));
}
function pickNum(obj: any, keys: string[]) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
            const n = toNum(obj[k]);
            if (Number.isFinite(n)) return n;
        }
    }
    return 0;
}
function pickStr(obj: any, keys: string[], fb = "") {
    for (const k of keys) {
        const s = toStr(obj?.[k]);
        if (s) return s;
    }
    return fb;
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

    const j = await fetchJson(url);
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
        { product_id: number; product_name: string; barcode: string; product_code: string }
    >();
    const ids = uniqNums(productIds);
    if (!ids.length) return map;

    const url =
        `${base}/items/${PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=product_id,product_name,barcode,product_code`;

    const j = await fetchJson(url);
    for (const p of j?.data ?? []) {
        const id = toNum(p?.product_id ?? p?.id);
        if (!id) continue;
        map.set(id, {
            product_id: id,
            product_name: toStr(p?.product_name, `Product ${id}`),
            barcode: toStr(p?.barcode),
            product_code: toStr(p?.product_code),
        });
    }
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

        const j = await fetchJson(url);
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
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

function pickPrimaryKeyField(fieldsMeta: any[]): string {
    // prefer schema.is_primary_key
    for (const f of fieldsMeta) {
        if (f?.schema?.is_primary_key) return toStr(f?.field);
    }
    // common fallbacks
    const candidates = ["id", "branch_id", "company_branch_id", "warehouse_id", "location_id"];
    for (const c of candidates) {
        if (fieldsMeta.some((f) => toStr(f?.field) === c)) return c;
    }
    return "id";
}

function pickLabelField(fieldsMeta: any[]): string[] {
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

    const j = await fetchJson(url);
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
    supplier_name?: any;
};

async function fetchPendingPOs(base: string): Promise<PoHeaderRow[]> {
    const qs = [
        "limit=-1",
        "sort=-date_encoded",
        "fields=purchase_order_id,purchase_order_no,date,date_encoded,supplier_name,date_approved,approver_id",
        "filter[date_approved][_null]=true",
        "filter[approver_id][_null]=true",
    ].join("&");

    const url = `${base}/items/${PO_COLLECTION}?${qs}`;
    const j = await fetchJson(url);
    return Array.isArray(j?.data) ? j.data : [];
}

type PoProductRow = {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    unit_price?: string | number | null;
    branch_id?: number | null;
};

async function fetchPOProductsByPOIds(base: string, poIds: number[]) {
    if (!poIds.length) return [] as PoProductRow[];

    // ✅ include unit_price (fixes blank price per item)
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(poIds.join(","))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,unit_price,branch_id`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

async function fetchPOProductsByPOId(base: string, poId: number) {
    const url =
        `${base}/items/${PO_PRODUCTS_COLLECTION}?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&fields=purchase_order_product_id,purchase_order_id,product_id,ordered_quantity,unit_price,branch_id`;

    const j = await fetchJson(url);
    return (j?.data ?? []) as PoProductRow[];
}

// =====================
// DETAIL BUILDER
// =====================
async function buildPurchaseOrderDetail(base: string, poId: number) {
    // ✅ do not force fields (avoid permission errors)
    const headerUrl = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
    const headerJ = await fetchJson(headerUrl);
    const header: any = headerJ?.data ?? null;
    if (!header?.purchase_order_id) throw new Error("PO not found.");

    const poNumber = toStr(header?.purchase_order_no, String(poId));
    const date = toStr(header?.date ?? header?.date_encoded, "");
    const currency = (toStr(header?.currency, "PHP") as any) || "PHP";

    const supplierId = toNum(header?.supplier_name);
    const suppliersMap = await fetchSuppliersMapByIds(base, supplierId ? [supplierId] : []);
    const supplierName = supplierId ? toStr(suppliersMap.get(supplierId)?.supplier_name, "—") : "—";

    const lines = await fetchPOProductsByPOId(base, poId);

    const branchIds = uniqNums(lines.map((l) => l.branch_id));
    const branchesMap = await fetchBranchesMapByIds(base, branchIds);
    const bs = branchSummary(branchIds, branchesMap);

    const productIds = uniqNums(lines.map((l) => l.product_id));
    const productsMap = await fetchProductsMapByIds(base, productIds);

    const items = lines.map((l) => {
        const pid = toNum(l.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const qty = Math.max(0, toNum(l.ordered_quantity));
        const unit = toNum(l.unit_price);
        const lineTotal = qty * unit;

        const barcode = toStr(p?.barcode) || toStr(p?.product_code) || (pid ? String(pid) : "");
        const name = toStr(p?.product_name, `Product #${pid || l.product_id}`);

        return {
            id: String(l.purchase_order_product_id),
            purchase_order_product_id: l.purchase_order_product_id,
            product_id: pid,
            productId: String(pid || ""),
            name,
            barcode,
            uom: toStr((l as any)?.uom, ""),

            ordered_quantity: qty,
            expectedQty: qty,

            unit_price: unit,
            unitPrice: unit,
            price: unit,

            line_total: lineTotal,
            lineTotal,

            branch_id: toNum(l.branch_id),
        };
    });

    const allocationsMap = new Map<number, any>();
    for (const it of items) {
        const bid = toNum(it.branch_id);
        if (!bid) continue;
        if (!allocationsMap.has(bid)) {
            allocationsMap.set(bid, {
                branch: { id: String(bid), name: branchesMap.get(bid)?.name ?? `Branch ${bid}` },
                items: [],
            });
        }
        allocationsMap.get(bid).items.push(it);
    }
    const allocations = Array.from(allocationsMap.values());

    // ===== Financials + discount =====
    const grossComputed = items.reduce((sum, it) => sum + toNum(it.line_total ?? it.lineTotal), 0);

    const grossHeader = pickNum(header, ["gross_amount", "grossAmount", "subtotal", "sub_total"]);
    const gross = grossHeader || grossComputed;

    let discountAmount = pickNum(header, [
        "discounted_amount",
        "discount_amount",
        "discountAmount",
        "discount_value",
        "discountValue",
    ]);

    let discountPercent = pickNum(header, [
        "discount_percent",
        "discountPercent",
        "discount_rate",
        "discountRate",
        "discount_percentage",
        "discountPercentage",
    ]);

    if (!discountAmount && discountPercent > 0 && gross > 0) {
        discountAmount = (gross * discountPercent) / 100;
    }
    if (!discountPercent && discountAmount > 0 && gross > 0) {
        discountPercent = (discountAmount / gross) * 100;
    }

    const discountType = pickStr(header, ["discount_type", "discountType", "discount_code", "discountCode"], "");

    const vatHeader = pickNum(header, ["vat_amount", "vatAmount", "vat"]);
    const ewtHeader = pickNum(header, ["withholding_tax_amount", "withholdingAmount", "ewt_amount", "ewtGoods"]);
    const totalHeader = pickNum(header, ["total_amount", "totalAmount", "total"]);

    const vat = vatHeader || (gross - discountAmount) * 0.12;
    const ewt = ewtHeader || 0;
    const total = totalHeader || gross - discountAmount + vat - ewt;

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

        gross_amount: gross,
        grossAmount: gross,

        discounted_amount: discountAmount,
        discountAmount: discountAmount,

        discount_percent: discountPercent,
        discountPercent: discountPercent,

        discount_type: discountType,
        discountType: discountType,

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

        const supplierIds = uniqNums(headers.map((h) => h.supplier_name));
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
            };
        });

        return ok(list);
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed to load approval POs"), 500);
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

        const patch: any = { date_approved: new Date().toISOString() };
        if (Boolean(body?.markAsInvoice)) patch.payment_status = 2;

        const url = `${base}/items/${PO_COLLECTION}/${encodeURIComponent(String(poId))}`;
        await fetchJson(url, { method: "PATCH", body: JSON.stringify(patch) });

        return ok({ ok: true });
    } catch (e: any) {
        return bad(String(e?.message ?? e ?? "Failed to approve PO"), 400);
    }
}
