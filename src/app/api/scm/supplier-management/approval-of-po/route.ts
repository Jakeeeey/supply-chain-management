// src/app/api/scm/supplier-management/approval-of-po/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

/** ✅ .env.local dependent base */
function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    const cleaned = String(raw || "").trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(cleaned)) return `http://${cleaned}`;
    return cleaned;
}

/** ✅ ALWAYS use server/static token to avoid Directus role field stripping */
function getServerToken() {
    return String(process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
}

function buildHeaders(_req?: NextRequest) {
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

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function pickNumber(obj: any, keys: string[], fallback = 0): number {
    for (const k of keys) {
        const v = obj?.[k];
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return fallback;
}

function mapPaymentTermToPaymentType(term: string): number {
    switch (term) {
        case "cash_with_order":
            return 1;
        case "cash_on_delivery":
            return 2;
        case "terms":
            return 3;
        default:
            return 0;
    }
}

function safeStr(v: any, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

function toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

// ---------- Fetch helpers ----------
async function fetchJson(url: string, req?: NextRequest) {
    const r = await fetch(url, { headers: buildHeaders(req), cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = j?.errors?.[0]?.message || j?.error || `Upstream failed: ${r.status}`;
        throw new Error(msg);
    }
    return j;
}

async function fetchBranchesMap(base: string, req?: NextRequest) {
    const url = `${base}/items/branches?limit=-1`;
    const j = await fetchJson(url, req);

    const map = new Map<number, any>();
    for (const b of j?.data ?? []) {
        const id = Number(b?.id);
        if (!Number.isFinite(id)) continue;

        map.set(id, {
            id,
            branch_code: String(b?.branch_code ?? ""),
            branch_name: String(b?.branch_name ?? b?.branch_description ?? "—"),
            branch_description: b?.branch_description ?? null,
        });
    }
    return map;
}

async function fetchSuppliersMap(base: string, req?: NextRequest) {
    const url = `${base}/items/suppliers?limit=-1`;
    const j = await fetchJson(url, req);

    const map = new Map<number, any>();
    for (const s of j?.data ?? []) {
        const id = Number(s?.id);
        if (!Number.isFinite(id)) continue;

        map.set(id, {
            id,
            supplier_name: String(s?.supplier_name ?? "—"),
            ap_balance: Number(s?.ap_balance ?? s?.apBalance ?? 0) || 0,
        });
    }
    return map;
}

async function fetchPOProductsByPoIds(base: string, poIds: number[], req?: NextRequest) {
    if (!poIds.length) return [];

    const inList = poIds.join(",");
    const url =
        `${base}/items/purchase_order_products?limit=-1` +
        `&filter[purchase_order_id][_in]=${encodeURIComponent(inList)}` +
        `&fields=purchase_order_id,branch_id`;

    const j = await fetchJson(url, req);
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchPOProducts(base: string, poId: string, req?: NextRequest) {
    const url =
        `${base}/items/purchase_order_products?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(poId)}` +
        `&fields=` +
        [
            "purchase_order_product_id",
            "purchase_order_id",
            "branch_id",
            "product_id",
            "ordered_quantity",
            "unit_price",
            "total_amount",
            "vat_amount",
            "withholding_amount",
        ].join(",");

    const j = await fetchJson(url, req);
    return Array.isArray(j?.data) ? j.data : [];
}

async function fetchProductsMap(base: string, productIds: number[], req?: NextRequest) {
    const map = new Map<number, any>();
    if (!productIds.length) return map;

    const inList = productIds.join(",");
    const url =
        `${base}/items/products?limit=-1` +
        `&filter[product_id][_in]=${encodeURIComponent(inList)}` +
        `&fields=product_id,product_name,product_code`;

    const j = await fetchJson(url, req);

    for (const p of j?.data ?? []) {
        const id = Number(p?.product_id ?? p?.id);
        if (!Number.isFinite(id)) continue;
        map.set(id, {
            product_id: id,
            product_name: String(p?.product_name ?? p?.name ?? `Product ${id}`),
            product_code: String(p?.product_code ?? p?.sku ?? ""),
        });
    }

    return map;
}

function buildBranchArrayFromIds(branchIds: Array<number | null | undefined>, branchesMap: Map<number, any>) {
    const uniq = new Set<number>();
    for (const b of branchIds) {
        const n = Number(b);
        if (Number.isFinite(n) && n > 0) uniq.add(n);
    }
    const arr: any[] = [];
    for (const id of uniq) {
        const b = branchesMap.get(id);
        if (b) arr.push(b);
    }
    return arr;
}

// ---------- Route ----------
export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();

        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        const [branchesMap, suppliersMap] = await Promise.all([
            fetchBranchesMap(base, req),
            fetchSuppliersMap(base, req),
        ]);

        // LIST: pending approvals
        if (!id) {
            const listUrl =
                `${base}/items/purchase_order` +
                `?limit=-1` +
                `&sort=-date_encoded` +
                `&filter[_or][0][approver_id][_null]=true` +
                `&filter[_or][1][approver_id][_eq]=0` +
                `&fields=` +
                [
                    "purchase_order_id",
                    "purchase_order_no",
                    "date_encoded",
                    "date",
                    "gross_amount",
                    "discounted_amount",
                    "vat_amount",
                    "withholding_tax_amount",
                    "total_amount",
                    "receipt_required",
                    "payment_type",
                    "payment_status",
                    "inventory_status",
                    "lead_time_payment",
                    "supplier_name",
                ].join(",");

            const j = await fetchJson(listUrl, req);
            const rowsRaw = Array.isArray(j?.data) ? j.data : [];

            const poIds = rowsRaw
                .map((po: any) => Number(po?.purchase_order_id))
                .filter((n: any) => Number.isFinite(n) && n > 0);

            // ✅ derive branches from purchase_order_products (multi-branch)
            const poProducts = await fetchPOProductsByPoIds(base, poIds, req);

            const branchesByPo = new Map<number, number[]>();
            for (const r of poProducts) {
                const poId = Number(r?.purchase_order_id);
                const brId = Number(r?.branch_id);
                if (!Number.isFinite(poId) || poId <= 0) continue;
                if (!Number.isFinite(brId) || brId <= 0) continue;

                const arr = branchesByPo.get(poId) ?? [];
                arr.push(brId);
                branchesByPo.set(poId, arr);
            }

            const rows = rowsRaw.map((po: any) => {
                const poIdNum = Number(po?.purchase_order_id);

                const sid = Number(po?.supplier_name);
                const supplier = Number.isFinite(sid) ? suppliersMap.get(sid) : null;

                const brIds = branchesByPo.get(poIdNum) ?? [];
                const brArr = buildBranchArrayFromIds(brIds, branchesMap);

                return {
                    ...po,

                    supplier_name_value: po?.supplier_name ?? null,
                    supplier_name: supplier ?? { supplier_name: "—", ap_balance: 0 },

                    branch_id_value: po?.branch_id ?? null,
                    branch_id: brArr, // ✅ array
                };
            });

            return NextResponse.json({ data: rows });
        }

        // DETAIL (avoid fields=* to prevent permission errors)
        const detailUrl =
            `${base}/items/purchase_order/${encodeURIComponent(id)}` +
            `?fields=` +
            [
                "purchase_order_id",
                "purchase_order_no",
                "date",
                "date_encoded",
                "gross_amount",
                "discounted_amount",
                "vat_amount",
                "withholding_tax_amount",
                "total_amount",
                "receipt_required",
                "payment_type",
                "payment_status",
                "inventory_status",
                "lead_time_payment",
                "lead_time_receiving",
                "supplier_name",
                "reference",
                "remark",
                "receiving_type",
                "transaction_type",
                "branch_id",
            ].join(",");

        const dj = await fetchJson(detailUrl, req);
        const po = dj?.data ?? {};

        const sid = Number(po?.supplier_name);
        const supplier = Number.isFinite(sid) ? suppliersMap.get(sid) : null;

        // products from purchase_order_products
        const poProducts = await fetchPOProducts(base, id, req);

        const productIds = Array.from(
            new Set(
                poProducts
                    .map((x: any) => Number(x?.product_id))
                    .filter((n: any) => Number.isFinite(n) && n > 0)
            )
        );

        const productsMap = await fetchProductsMap(base, productIds, req);

        const items = poProducts.map((ln: any, idx: number) => {
            const pid = Number(ln?.product_id);
            const p = Number.isFinite(pid) ? productsMap.get(pid) : null;

            const qty = toNum(ln?.ordered_quantity ?? 0);
            const unitPrice = toNum(ln?.unit_price ?? 0);
            const lineTotal = toNum(ln?.total_amount ?? 0) || qty * unitPrice;

            return {
                po_item_id: ln?.purchase_order_product_id ?? idx + 1,
                purchase_order_id: ln?.purchase_order_id ?? po?.purchase_order_id ?? id,
                line_no: idx + 1,
                item_name: safeStr(p?.product_name ?? `Product ${pid}`),
                item_description: null,
                uom: "BOX",
                qty: String(qty),
                unit_price: String(unitPrice),
                line_total: String(lineTotal),
                branch_id: ln?.branch_id ?? null,
                product_id: ln?.product_id ?? null,
            };
        });

        const brArr = buildBranchArrayFromIds(
            poProducts.map((x: any) => Number(x?.branch_id)),
            branchesMap
        );

        return NextResponse.json({
            data: {
                ...po,

                supplier_name_value: po?.supplier_name ?? null,
                supplier_name: supplier ?? { supplier_name: "—", ap_balance: 0 },

                branch_id_value: po?.branch_id ?? null,
                branch_id: brArr, // ✅ array

                items,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const body = await req.json().catch(() => ({}));

        const id = String(body?.id ?? "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const markAsInvoice = Boolean(body?.markAsInvoice);
        const paymentTerm = String(body?.paymentTerm ?? "cash_on_delivery");
        const termsDaysRaw = Number(body?.termsDays);

        // If cookie exists, use it only to determine approver_id (optional)
        const jwt = req.cookies.get(COOKIE_NAME)?.value ?? null;
        const payload = jwt ? decodeJwtPayload(jwt) : null;

        const approverId = pickNumber(payload, ["user_id", "userId", "id", "uid", "UserId", "EmployeeId"], 0);

        const patch: any = {
            approver_id: approverId || 1,
            date_approved: new Date().toISOString(),
            receipt_required: markAsInvoice ? 1 : 0,
            payment_type: mapPaymentTermToPaymentType(paymentTerm),
        };

        if (paymentTerm === "terms") {
            const safeDays = Number.isFinite(termsDaysRaw) ? Math.max(1, Math.floor(termsDaysRaw)) : 1;
            patch.lead_time_payment = safeDays;
        }

        const patchUrl = `${base}/items/purchase_order/${encodeURIComponent(id)}`;
        const r = await fetch(patchUrl, {
            method: "PATCH",
            headers: buildHeaders(req),
            body: JSON.stringify(patch),
            cache: "no-store",
        });

        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to approve PO");

        return NextResponse.json({ data: j?.data ?? j });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
    }
}
