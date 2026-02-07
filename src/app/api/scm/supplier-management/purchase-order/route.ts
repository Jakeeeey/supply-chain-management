// api/scm/supplier-management/purchase-order/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDirectusBase() {
    const raw =
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    if (!/^https?:\/\//i.test(raw)) return `http://${raw}`;
    return raw.replace(/\/$/, "");
}

function now() {
    return new Date();
}

function isoDateOnlyFrom(value?: any) {
    if (!value) return now().toISOString().slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return now().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function isoDateTimeFrom(value?: any) {
    if (!value) return now().toISOString();
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return now().toISOString();
    return d.toISOString();
}

function timeHHMMSSFrom(value?: any) {
    const d = value ? new Date(value) : now();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function numOrZero(v: any) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function intOrDefault(v: any, dflt: number) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : dflt;
}

function strOrDefault(v: any, dflt: string) {
    const s = v === undefined || v === null ? "" : String(v).trim();
    return s.length ? s : dflt;
}

function pickSupplierId(input: any): number | null {
    const v =
        input?.supplier_name ??
        input?.supplierId ??
        input?.supplier_id ??
        input?.supplier ??
        input?.supplier?.id;

    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function pickPoNumber(input: any): string | null {
    const v =
        input?.purchase_order_no ??
        input?.poNumber ??
        input?.po_number ??
        input?.poNo;

    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}

function isNotUniqueDirectusError(json: any) {
    const errs: any[] = Array.isArray(json?.errors) ? json.errors : [];
    return errs.some((e) => e?.extensions?.code === "RECORD_NOT_UNIQUE");
}

function toFixedMoney(v: any) {
    const n = Number(v);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toFixed(2);
}

function pickEnvToken() {
    // prefer DIRECTUS_TOKEN, fallback to DIRECTUS_STATIC_TOKEN
    return process.env.DIRECTUS_TOKEN || process.env.DIRECTUS_STATIC_TOKEN || "";
}

async function directusFetch(url: string, init?: RequestInit) {
    const TOKEN = pickEnvToken();
    return fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
            ...(init?.headers || {}),
        },
    });
}

async function findExistingByPoNumber(base: string, poNumber: string) {
    const url =
        `${base}/items/purchase_order` +
        `?filter[purchase_order_no][_eq]=${encodeURIComponent(poNumber)}` +
        `&limit=1`;

    const res = await directusFetch(url, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    const row = Array.isArray(json?.data) ? json.data[0] : null;
    return row ?? null;
}

function extractPoId(row: any): number | null {
    const v = row?.purchase_order_id ?? row?.id;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function buildPoProductLines(input: any, poId: number) {
    const allocations = Array.isArray(input?.allocations) ? input.allocations : [];
    const lines: any[] = [];

    for (const a of allocations) {
        const branchIdRaw = a?.branchId ?? a?.branch_id ?? a?.id ?? null;
        const branchIdNum = Number(branchIdRaw);
        const branch_id = Number.isFinite(branchIdNum) && branchIdNum > 0 ? branchIdNum : null;

        const items = Array.isArray(a?.items) ? a.items : [];
        for (const it of items) {
            const productIdRaw = it?.id ?? it?.productId ?? it?.product_id ?? null;
            const productIdNum = Number(productIdRaw);
            if (!Number.isFinite(productIdNum) || productIdNum <= 0) continue;

            const qty = Math.max(1, Number(it?.orderQty ?? it?.qtyBoxes ?? it?.qty ?? 1) || 1);
            const unitPrice = Number(it?.price ?? it?.pricePerBox ?? it?.unit_price ?? 0) || 0;
            const lineTotal = qty * unitPrice;

            lines.push({
                purchase_order_id: poId,
                branch_id,
                product_id: productIdNum,
                ordered_quantity: qty,
                unit_price: toFixedMoney(unitPrice),
                total_amount: toFixedMoney(lineTotal),
                // keep these nullable; later modules can compute/override
                vat_amount: null,
                withholding_amount: null,
                discounted_price: null,
                approved_price: null,
                received: null,
            });
        }
    }

    return lines;
}

async function poProductsAlreadyExist(base: string, poId: number) {
    const url =
        `${base}/items/purchase_order_products` +
        `?filter[purchase_order_id][_eq]=${encodeURIComponent(String(poId))}` +
        `&limit=1&fields=purchase_order_product_id`;

    const r = await directusFetch(url, { method: "GET" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return false;
    return Array.isArray(j?.data) && j.data.length > 0;
}

async function ensurePoProducts(base: string, poId: number, input: any) {
    const lines = buildPoProductLines(input, poId);
    if (!lines.length) return { created: 0, skipped: true };

    const exists = await poProductsAlreadyExist(base, poId);
    if (exists) return { created: 0, skipped: true };

    const url = `${base}/items/purchase_order_products`;

    // Directus "create many" expects { data: [...] }
    const r = await directusFetch(url, {
        method: "POST",
        body: JSON.stringify({ data: lines }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error(j?.errors?.[0]?.message || j?.error || "Failed to create purchase_order_products");
    }

    const createdCount = Array.isArray(j?.data) ? j.data.length : lines.length;
    return { created: createdCount, skipped: false };
}

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();

        const body = await req.json().catch(() => null);
        const input = (body?.data ?? body?.payload ?? body) as any;

        const supplierId = pickSupplierId(input);
        const poNumber = pickPoNumber(input);

        if (!supplierId || !poNumber) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    required: ["supplier_name (or supplierId)", "purchase_order_no (or poNumber)"],
                    receivedKeys: input && typeof input === "object" ? Object.keys(input) : input,
                    receivedPreview: input,
                },
                { status: 400 }
            );
        }

        // ✅ If already exists, return it (idempotent save)
        const existing = await findExistingByPoNumber(base, poNumber);
        if (existing) {
            const existingPoId = extractPoId(existing);
            if (existingPoId) {
                // ✅ if header exists but lines missing, create lines once
                try {
                    await ensurePoProducts(base, existingPoId, input);
                } catch {
                    // don't block returning existing header; lines can be retried by saving again
                }
            }

            return NextResponse.json({
                data: existing,
                meta: { alreadyExists: true, purchase_order_no: poNumber },
            });
        }

        // amounts
        const gross_amount = numOrZero(input?.gross_amount ?? input?.grossAmount ?? input?.subtotal);
        const discounted_amount = numOrZero(input?.discounted_amount ?? input?.discountAmount ?? input?.discount);
        const vat_amount = numOrZero(input?.vat_amount ?? input?.vatAmount ?? input?.vat ?? input?.tax);
        const total_amount = numOrZero(input?.total_amount ?? input?.totalAmount ?? input?.total);
        const withholding_tax_amount = numOrZero(
            input?.withholding_tax_amount ?? input?.ewtGoods ?? input?.ewt_goods
        );

        // dates
        const date = isoDateOnlyFrom(input?.date ?? input?.poDateISO ?? input?.poDate);
        const date_encoded = isoDateTimeFrom(input?.date_encoded ?? input?.dateEncoded ?? now());
        const datetime = isoDateTimeFrom(input?.datetime ?? input?.dateTime ?? now());
        const time = String(input?.time ?? timeHHMMSSFrom(now()));

        // required/system defaults (overrideable)
        const payment_type = intOrDefault(input?.payment_type ?? input?.paymentType, 0);
        const payment_status = intOrDefault(input?.payment_status ?? input?.paymentStatus, 2);
        const transaction_type = intOrDefault(input?.transaction_type ?? input?.transactionType, 1);
        const receiving_type = intOrDefault(input?.receiving_type ?? input?.receivingType, 3);
        const receipt_required = intOrDefault(input?.receipt_required ?? input?.receiptRequired, 1);
        const price_type = strOrDefault(input?.price_type ?? input?.priceType, "General Receive Price");
        const inventory_status = intOrDefault(input?.inventory_status ?? input?.inventoryStatus, 1);

        const payload: any = {
            purchase_order_no: poNumber,
            supplier_name: supplierId,

            date,
            date_encoded,
            datetime,
            time,

            gross_amount,
            discounted_amount,
            vat_amount,
            total_amount,
            withholding_tax_amount,

            payment_type,
            payment_status,
            transaction_type,
            receiving_type,
            receipt_required,
            price_type,
            inventory_status,

            reference: input?.reference ?? null,
            remark: input?.remark ?? null,

            // IMPORTANT: header branch_id is single only; since branch-first is multi,
            // keep this nullable (we will derive branches from purchase_order_products)
            branch_id: input?.branch_id ?? input?.branchId ?? null,

            price_type_id: input?.price_type_id ?? null,
        };

        for (const k of Object.keys(payload)) {
            if (payload[k] === undefined) delete payload[k];
        }

        const upstream = `${base}/items/purchase_order`;

        const res = await directusFetch(upstream, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (isNotUniqueDirectusError(json)) {
                const again = await findExistingByPoNumber(base, poNumber);
                if (again) {
                    const againPoId = extractPoId(again);
                    if (againPoId) {
                        try {
                            await ensurePoProducts(base, againPoId, input);
                        } catch {}
                    }

                    return NextResponse.json({
                        data: again,
                        meta: { alreadyExists: true, purchase_order_no: poNumber, raced: true },
                    });
                }
            }

            return NextResponse.json(
                {
                    error: "Directus create purchase_order failed",
                    status: res.status,
                    details: json,
                    sentPayload: payload,
                },
                { status: res.status }
            );
        }

        const created = json?.data ?? json;
        const createdPoId = extractPoId(created);

        let linesMeta: any = { created: 0, skipped: true };
        if (createdPoId) {
            linesMeta = await ensurePoProducts(base, createdPoId, input);
        }

        return NextResponse.json({
            data: created,
            meta: {
                alreadyExists: false,
                purchase_order_no: poNumber,
                po_products: linesMeta,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to save purchase order", details: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
