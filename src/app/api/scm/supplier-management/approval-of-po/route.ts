import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

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

function normalizeBaseUrl(url: string) {
    return String(url || "").replace(/\/+$/, "");
}

function getDirectusConfig() {
    const DIRECTUS_URL =
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL;

    const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!DIRECTUS_URL) throw new Error("DIRECTUS_URL is not set");
    return { DIRECTUS_URL: normalizeBaseUrl(DIRECTUS_URL), TOKEN };
}

function authHeaders(token?: string) {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
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

async function fetchBranchesMap(DIRECTUS_URL: string, TOKEN?: string) {
    const url =
        `${DIRECTUS_URL}/items/branches?limit=-1&fields=` +
        ["id", "branch_name", "branch_code", "branch_description"].join(",");

    const r = await fetch(url, { headers: authHeaders(TOKEN), cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to fetch branches");
    }

    const map = new Map<number, any>();
    for (const b of j?.data ?? []) {
        const id = Number(b?.id);
        if (Number.isFinite(id)) {
            map.set(id, {
                id,
                branch_code: String(b?.branch_code ?? ""),
                branch_name: String(b?.branch_name ?? b?.branch_description ?? ""),
                branch_description: b?.branch_description ?? null,
            });
        }
    }
    return map;
}

/**
 * ✅ Supplier map (handles your supplier_name = numeric ID)
 * We'll try common collection names: suppliers / supplier.
 */
async function fetchSuppliersMap(DIRECTUS_URL: string, TOKEN?: string) {
    const tryCollections = ["suppliers", "supplier"];

    for (const col of tryCollections) {
        try {
            const url =
                `${DIRECTUS_URL}/items/${col}?limit=-1&fields=` +
                ["id", "supplier_name", "name", "ap_balance", "apBalance"].join(",");

            const r = await fetch(url, { headers: authHeaders(TOKEN), cache: "no-store" });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) continue;

            const map = new Map<number, any>();
            for (const s of j?.data ?? []) {
                const id = Number(s?.id);
                if (!Number.isFinite(id)) continue;

                map.set(id, {
                    id,
                    supplier_name: String(s?.supplier_name ?? s?.name ?? "—"),
                    ap_balance: Number(s?.ap_balance ?? s?.apBalance ?? 0) || 0,
                });
            }

            // if we got data, return immediately
            if (map.size > 0) return map;
        } catch {
            // try next collection name
        }
    }

    // fallback empty map
    return new Map<number, any>();
}

async function fetchPOItems(DIRECTUS_URL: string, TOKEN: string | undefined, poId: string) {
    const itemsUrl =
        `${DIRECTUS_URL}/items/purchase_order_items?limit=-1` +
        `&filter[purchase_order_id][_eq]=${encodeURIComponent(poId)}` +
        `&sort=line_no` +
        `&fields=` +
        [
            "po_item_id",
            "purchase_order_id",
            "line_no",
            "item_name",
            "item_description",
            "uom",
            "qty",
            "unit_price",
            "line_subtotal",
            "tax_rate",
            "tax_amount",
            "discount_amount",
            "line_total",
            "expected_date",
            "notes",
            "supplier_id",
            "currency",
            "created_at",
            "updated_at",
        ].join(",");

    const ir = await fetch(itemsUrl, { headers: authHeaders(TOKEN), cache: "no-store" });
    const ij = await ir.json().catch(() => ({}));
    if (!ir.ok) {
        throw new Error(ij?.errors?.[0]?.message || ij?.error || "Failed to fetch PO items");
    }

    return Array.isArray(ij?.data) ? ij.data : [];
}

export async function GET(req: NextRequest) {
    try {
        const { DIRECTUS_URL, TOKEN } = getDirectusConfig();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        const [branchesMap, suppliersMap] = await Promise.all([
            fetchBranchesMap(DIRECTUS_URL, TOKEN),
            fetchSuppliersMap(DIRECTUS_URL, TOKEN),
        ]);

        if (!id) {
            const listUrl =
                `${DIRECTUS_URL}/items/purchase_order` +
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
                    "branch_id",
                ].join(",");

            const r = await fetch(listUrl, {
                headers: authHeaders(TOKEN),
                cache: "no-store",
            });

            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to fetch pending POs");
            }

            const rows = (j?.data ?? []).map((po: any) => {
                // branch
                const bid = Number(po?.branch_id);
                const branch = Number.isFinite(bid) ? branchesMap.get(bid) : null;

                // supplier
                const sid = Number(po?.supplier_name);
                const supplier = Number.isFinite(sid) ? suppliersMap.get(sid) : null;

                return {
                    ...po,
                    branch_id_value: po?.branch_id ?? null,
                    branch_id: branch ?? po?.branch_id ?? null,

                    supplier_name_value: po?.supplier_name ?? null,
                    supplier_name: supplier ?? po?.supplier_name ?? null, // if map found -> object
                };
            });

            return NextResponse.json({ data: rows });
        }

        const detailUrl =
            `${DIRECTUS_URL}/items/purchase_order/${encodeURIComponent(id)}` +
            `?fields=*`;

        const r = await fetch(detailUrl, { headers: authHeaders(TOKEN), cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
            throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to fetch PO detail");
        }

        const po = j?.data ?? {};

        // branch
        const bid = Number(po?.branch_id);
        const branch = Number.isFinite(bid) ? branchesMap.get(bid) : null;

        // supplier
        const sid = Number(po?.supplier_name);
        const supplier = Number.isFinite(sid) ? suppliersMap.get(sid) : null;

        const items = await fetchPOItems(DIRECTUS_URL, TOKEN, id);

        return NextResponse.json({
            data: {
                ...po,
                branch_id_value: po?.branch_id ?? null,
                branch_id: branch ?? po?.branch_id ?? null,

                supplier_name_value: po?.supplier_name ?? null,
                supplier_name: supplier ?? po?.supplier_name ?? null,

                items,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { DIRECTUS_URL, TOKEN } = getDirectusConfig();
        const body = await req.json().catch(() => ({}));

        const id = String(body?.id ?? "");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const markAsInvoice = Boolean(body?.markAsInvoice);
        const paymentTerm = String(body?.paymentTerm ?? "cash_on_delivery");
        const termsDaysRaw = Number(body?.termsDays);

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

        const patchUrl = `${DIRECTUS_URL}/items/purchase_order/${encodeURIComponent(id)}`;
        const r = await fetch(patchUrl, {
            method: "PATCH",
            headers: authHeaders(TOKEN),
            body: JSON.stringify(patch),
        });

        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to approve PO");

        return NextResponse.json({ data: j?.data ?? j });
    } catch (e: any) {
        return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
    }
}
