// src/app/api/scm/supplier-management/approval-of-po/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================
// DIRECTUS CONFIG
// =====================
function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    const cleaned = String(raw || "").trim().replace(/\/$/, "");
    if (!cleaned) return "http://100.110.197.61:8056";
    if (!/^https?:\/\//i.test(cleaned)) return `http://${cleaned}`;
    return cleaned;
}

function getServerToken() {
    return String(process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
}

function buildHeaders() {
    const token = getServerToken();
    if (!token) {
        throw new Error(
            "DIRECTUS_STATIC_TOKEN (or DIRECTUS_TOKEN) is missing. Add it to .env.local then restart dev server."
        );
    }
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, {
        ...init,
        headers: { ...(buildHeaders() as any), ...(init?.headers ?? {}) },
        cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = j?.errors?.[0]?.message || j?.error || `Upstream failed: ${r.status}`;
        throw new Error(msg);
    }
    return j;
}

// =====================
// CONSTS
// =====================
const PO_COLLECTION = "purchase_order";
const PO_PRODUCTS_COLLECTION = "purchase_order_products";
const SUPPLIERS_COLLECTION = "suppliers";
const PRODUCTS_COLLECTION = "products";

const BRANCHES_COLLECTION = (process.env.BRANCHES_COLLECTION || "").trim();

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

// safe-pick helpers (no field assumptions)
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
    const map = new Map<number, { product_id: number; product_name: string; barcode: string; product_code: string }>();
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
// BRANCH MAP (robust)
// =====================
async function tryFetchBranches(
    base: string,
    collection: string,
    ids: number[],
    filterKey: "id" | "branch_id",
    fields: string
) {
    const url =
        `${base}/items/${collection}?limit=-1` +
        `&filter[${filterKey}][_in]=${encodeURIComponent(ids.join(","))}` +
        `&fields=${encodeURIComponent(fields)}`;

    const j = await fetchJson(url);
    const rows = Array.isArray(j?.data) ? j.data : [];
    if (!rows.length) return null;

    const map = new Map<number, { id: number; name: string }>();
    for (const r of rows) {
        const id = toNum(r?.id ?? r?.branch_id);
        if (!id) continue;
        const name = toStr(r?.name ?? r?.branch_name ?? r?.branch ?? `Branch ${id}`);
        map.set(id, { id, name });
    }
    return map.size ? map : null;
}

async function fetchBranchesMapByIds(base: string, branchIds: number[]) {
    const ids = uniqNums(branchIds);
    const map = new Map<number, { id: number; name: string }>();
    if (!ids.length) return map;

    const candidates = [
        BRANCHES_COLLECTION,
        "branches",
        "branch",
        "company_branches",
        "company_branch",
        "branch_list",
        "branch_master",
        "warehouses",
        "warehouse",
    ].filter(Boolean);

    for (const col of candidates) {
        const attempts: Array<[("id" | "branch_id"), string]> = [
            ["id", "id,name,branch_name"],
            ["id", "id,branch_name,name"],
            ["branch_id", "branch_id,name,branch_name"],
            ["branch_id", "branch_id,branch_name,name"],
        ];

        for (const [filterKey, fields] of attempts) {
            try {
                const got = await tryFetchBranches(base, col, ids, filterKey, fields);
                if (got) {
                    for (const [k, v] of got.entries()) map.set(k, v);
                    if (map.size >= ids.length) return map;
                }
            } catch {
                // ignore
            }
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
    // keep safe fields only
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

    // ✅ include unit_price (this fixes blank price per item)
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
    // ✅ IMPORTANT: do NOT force fields here (to avoid permission errors on unknown discount fields)
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

    // items
    const items = lines.map((l) => {
        const pid = toNum(l.product_id);
        const p = pid ? productsMap.get(pid) : null;

        const qty = Math.max(0, toNum(l.ordered_quantity));
        const unit = toNum(l.unit_price);
        const lineTotal = qty * unit;

        const barcode = toStr(p?.barcode) || toStr(p?.product_code) || (pid ? String(pid) : "");
        const name = toStr(p?.product_name, `Product #${pid || l.product_id}`);

        // ✅ add aliases so UI won’t miss it (unit_price/unitPrice/price)
        return {
            id: String(l.purchase_order_product_id),
            purchase_order_product_id: l.purchase_order_product_id,
            product_id: pid,
            productId: String(pid || ""),
            name,
            barcode,
            uom: toStr((l as any)?.uom, ""), // safe fallback
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

    // allocations grouped by branch
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

    // =====================
    // FINANCIALS + DISCOUNT (derive if needed)
    // =====================
    const grossComputed = items.reduce((sum, it) => sum + toNum(it.line_total ?? it.lineTotal), 0);

    const grossHeader = pickNum(header, ["gross_amount", "grossAmount", "subtotal", "sub_total"]);
    const gross = grossHeader || grossComputed;

    // discount amount
    let discountAmount = pickNum(header, [
        "discounted_amount",
        "discount_amount",
        "discountAmount",
        "discount_value",
        "discountValue",
    ]);

    // discount percent
    let discountPercent = pickNum(header, [
        "discount_percent",
        "discountPercent",
        "discount_rate",
        "discountRate",
        "discount_percentage",
        "discountPercentage",
    ]);

    // if discount amount missing but percent exists
    if (!discountAmount && discountPercent > 0 && gross > 0) {
        discountAmount = (gross * discountPercent) / 100;
    }

    // if percent missing but amount exists
    if (!discountPercent && discountAmount > 0 && gross > 0) {
        discountPercent = (discountAmount / gross) * 100;
    }

    const discountType = pickStr(header, ["discount_type", "discountType", "discount_code", "discountCode"], "");

    // vat / ewt / total (prefer header if present)
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

        // branch fields
        branchName: bs.label,
        branch_name: bs.label,
        branch: { id: bs.id, name: bs.name },

        items,
        allocations,

        // financials (multiple aliases)
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

        // aggregates for list (includes unit_price now if you want totals by line)
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
