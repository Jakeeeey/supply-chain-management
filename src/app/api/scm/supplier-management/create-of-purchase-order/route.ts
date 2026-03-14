// src/app/api/scm/supplier-management/purchase-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, getDirectusToken } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServerToken() {
    return getDirectusToken();
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

async function directusFetch(url: string, init?: RequestInit) {
    const TOKEN = getServerToken();
    if (!TOKEN) {
        throw new Error(
            "DIRECTUS_STATIC_TOKEN (or DIRECTUS_TOKEN) is missing. Add it to .env.local then restart dev server."
        );
    }

    return fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
            ...(init?.headers || {}),
        },
    });
}

async function safeJson(res: Response) {
    const text = await res.text().catch(() => "");
    const json = (() => {
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { raw: text };
        }
    })();
    return { text, json };
}

async function findExistingByPoNumber(base: string, poNumber: string) {
    const url =
        `${base}/items/purchase_order` +
        `?filter[purchase_order_no][_eq]=${encodeURIComponent(poNumber)}` +
        `&limit=1`;

    const res = await directusFetch(url, { method: "GET" });
    const { json } = await safeJson(res);
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

            // qtyBoxes/orderQty required (fallback to 1)
            const qtyRaw = it?.orderQty ?? it?.qtyBoxes ?? it?.qty ?? 0;
            const qtyNum = Number(qtyRaw);
            const ordered_quantity = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1;

            const unitPrice = Number(it?.price ?? it?.pricePerBox ?? it?.unit_price ?? 0) || 0;
            const lineTotal = ordered_quantity * unitPrice;

            if (!branch_id) {
                // If your schema requires branch_id, fail early with a clear message
                throw new Error(
                    `Missing branch_id for product_id=${productIdNum}. Check allocations[].branchId in payload.`
                );
            }

            lines.push({
                purchase_order_id: poId,
                branch_id,
                product_id: productIdNum,
                ordered_quantity, // ✅ required
                unit_price: toFixedMoney(unitPrice),
                total_amount: toFixedMoney(lineTotal),
                vat_amount: null,
                withholding_amount: null,
                discount_type: it.discountTypeId || null,
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
    const { json } = await safeJson(r);
    if (!r.ok) return false;
    return Array.isArray(json?.data) && json.data.length > 0;
}

/**
 * ✅ Robust create-many:
 * Some Directus versions accept ARRAY body: [ {...}, {...} ]
 * Others accept WRAPPED body: { data: [ ... ] }
 * We'll try array first, then fallback to wrapped if needed.
 */
async function createManyPurchaseOrderProducts(base: string, lines: any[]) {
    const url = `${base}/items/purchase_order_products`;

    // try array body
    let r = await directusFetch(url, { method: "POST", body: JSON.stringify(lines) });
    let parsed = await safeJson(r);

    if (r.ok) return { ok: true, json: parsed.json };

    // fallback wrapped body
    r = await directusFetch(url, { method: "POST", body: JSON.stringify({ data: lines }) });
    parsed = await safeJson(r);

    if (r.ok) return { ok: true, json: parsed.json };

    const msg =
        parsed.json?.errors?.[0]?.message ||
        parsed.json?.error ||
        `Failed to create purchase_order_products (${r.status})`;

    return { ok: false, json: parsed.json, message: msg, status: r.status };
}

async function ensurePoProducts(base: string, poId: number, input: any) {
    const lines = buildPoProductLines(input, poId);

    if (!lines.length) {
        return { created: 0, skipped: true, reason: "No allocation lines" };
    }

    const exists = await poProductsAlreadyExist(base, poId);
    if (exists) return { created: 0, skipped: true, reason: "Lines already exist" };

    const result = await createManyPurchaseOrderProducts(base, lines);

    if (!result.ok) {
        throw new Error(
            `${result.message} :: preview=${JSON.stringify(lines.slice(0, 1))}`
        );
    }

    // Directus may return { data: [...] } or the created array directly
    const data = (result.json as any)?.data;
    const createdCount = Array.isArray(data) ? data.length : lines.length;

    return { created: createdCount, skipped: false };
}

async function deletePurchaseOrderHeader(base: string, poId: number) {
    const url = `${base}/items/purchase_order/${encodeURIComponent(String(poId))}`;
    const r = await directusFetch(url, { method: "DELETE" });
    if (!r.ok) {
        const { json } = await safeJson(r);
        const msg = json?.errors?.[0]?.message || json?.error || `Failed to rollback header (${r.status})`;
        throw new Error(msg);
    }
}

/** ---------------- ROUTE ---------------- */
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

        // ✅ If already exists: try to ensure lines.
        const existing = await findExistingByPoNumber(base, poNumber);
        if (existing) {
            const existingPoId = extractPoId(existing);

            if (existingPoId) {
                try {
                    const linesMeta = await ensurePoProducts(base, existingPoId, input);
                    return NextResponse.json({
                        data: existing,
                        meta: { alreadyExists: true, purchase_order_no: poNumber, po_products: linesMeta },
                    });
                } catch (e: any) {
                    // ✅ IMPORTANT: do NOT hide error (this is why you see "already exists" kahit walang lines)
                    return NextResponse.json(
                        {
                            error: "PO exists but failed to create missing PO product lines",
                            details: String(e?.message ?? e),
                            meta: { alreadyExists: true, purchase_order_no: poNumber, purchase_order_id: existingPoId },
                        },
                        { status: 500 }
                    );
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

        // defaults
        const payment_type = intOrDefault(input?.payment_type ?? input?.paymentType, 0);
        const payment_status = intOrDefault(input?.payment_status ?? input?.paymentStatus, 2);
        const transaction_type = intOrDefault(input?.transaction_type ?? input?.transactionType, 1);
        
        // Robust check for invoice flag (handles true, "true", 1, etc.)
        const isInvoiceFlag = 
            String(input?.is_invoice || "").toLowerCase() === "true" ||
            String(input?.isInvoice || "").toLowerCase() === "true" ||
            input?.is_invoice === true ||
            input?.isInvoice === true ||
            input?.receiving_type === 2 ||
            input?.receivingType === 2;

        const receiving_type = isInvoiceFlag ? 2 : 3;
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

            // header branch_id is single only; keep nullable (branches derived from purchase_order_products)
            branch_id: input?.branch_id ?? input?.branchId ?? null,
            price_type_id: input?.price_type_id ?? null,
        };

        for (const k of Object.keys(payload)) {
            if (payload[k] === undefined) delete payload[k];
        }

        const upstream = `${base}/items/purchase_order`;
        const res = await directusFetch(upstream, { method: "POST", body: JSON.stringify(payload) });
        const parsed = await safeJson(res);

        if (!res.ok) {
            if (isNotUniqueDirectusError(parsed.json)) {
                const again = await findExistingByPoNumber(base, poNumber);
                if (again) {
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
                    details: parsed.json,
                    sentPayload: payload,
                },
                { status: res.status }
            );
        }

        const created = parsed.json?.data ?? parsed.json;
        const createdPoId = extractPoId(created);

        // ✅ Create lines; if fails rollback header to avoid “existing with no lines”
        if (createdPoId) {
            try {
                const linesMeta = await ensurePoProducts(base, createdPoId, input);

                return NextResponse.json({
                    data: created,
                    meta: { alreadyExists: false, purchase_order_no: poNumber, po_products: linesMeta },
                });
            } catch (e: any) {
                let rolledBack = false;
                try {
                    await deletePurchaseOrderHeader(base, createdPoId);
                    rolledBack = true;
                } catch {
                    rolledBack = false;
                }

                return NextResponse.json(
                    {
                        error: "PO header created but failed to create PO product lines",
                        details: String(e?.message ?? e),
                        meta: {
                            purchase_order_no: poNumber,
                            purchase_order_id: createdPoId,
                            rolledBack,
                        },
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            data: created,
            meta: { alreadyExists: false, purchase_order_no: poNumber, po_products: { created: 0, skipped: true } },
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to save purchase order", details: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
