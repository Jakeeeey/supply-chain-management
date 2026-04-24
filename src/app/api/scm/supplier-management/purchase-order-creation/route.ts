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

async function directusFetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, {
        ...init,
        headers: { ...directusHeaders(), ...(init?.headers as Record<string, string> | undefined) },
        cache: "no-store",
    });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DirectusError {
    extensions?: {
        code?: string;
    };
    message?: string;
}

interface DirectusResponse {
    data?: unknown;
    errors?: DirectusError[];
    error?: string;
}


function now() {
    return new Date();
}

function isoDateOnlyFrom(value?: string | Date | number | null) {
    if (!value) return now().toISOString().slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return now().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function isoDateTimeFrom(value?: string | Date | number | null) {
    if (!value) return now().toISOString();
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return now().toISOString();
    return d.toISOString();
}

function timeHHMMSSFrom(value?: string | Date | number | null) {
    const d = value ? new Date(value) : now();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function numOrZero(v: unknown) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function intOrDefault(v: unknown, dflt: number) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : dflt;
}

function strOrDefault(v: unknown, dflt: string) {
    const s = v === undefined || v === null ? "" : String(v).trim();
    return s.length ? s : dflt;
}

interface SupplierPayload {
    supplier_name?: string | number;
    supplierId?: string | number;
    supplier_id?: string | number;
    supplier?: { id: string | number } | string | number;
}

function pickSupplierId(input: SupplierPayload): number | null {
    const v =
        input?.supplier_name ??
        input?.supplierId ??
        input?.supplier_id ??
        (typeof input?.supplier === 'object' ? input?.supplier?.id : input?.supplier);

    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

interface PoPayload {
    purchase_order_no?: string;
    poNumber?: string;
    po_number?: string;
    poNo?: string;
}

function pickPoNumber(input: PoPayload): string | null {
    const v =
        input?.purchase_order_no ??
        input?.poNumber ??
        input?.po_number ??
        input?.poNo;

    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}

function isNotUniqueDirectusError(json: DirectusResponse) {
    const errs = Array.isArray(json?.errors) ? json.errors : [];
    return errs.some((e) => e?.extensions?.code === "RECORD_NOT_UNIQUE");
}

function toFixedMoney(v: unknown) {
    const n = Number(v);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toFixed(2);
}


async function safeJson(res: Response) {
    const text = await res.text().catch(() => "");
    const json = (() => {
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { raw: text };
        }
    })() as DirectusResponse;
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

function extractPoId(row: Record<string, unknown> | null): number | null {
    if (!row) return null;
    const v = row.purchase_order_id ?? row.id;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

interface AllocationItem {
    id?: string | number;
    productId?: string | number;
    product_id?: string | number;
    orderQty?: string | number;
    qtyBoxes?: string | number;
    qty?: string | number;
    price?: string | number;
    pricePerBox?: string | number;
    unit_price?: string | number;
    discountTypeId?: string | number;
}

interface Allocation {
    branchId?: string | number;
    branch_id?: string | number;
    id?: string | number;
    items?: AllocationItem[];
}

function buildPoProductLines(input: { allocations?: Allocation[] }, poId: number) {
    const allocations = Array.isArray(input?.allocations) ? input.allocations : [];
    const lines: Record<string, unknown>[] = [];

    for (const a of allocations) {
        const branchIdRaw = a?.branchId ?? a?.branch_id ?? a?.id ?? null;
        const branchIdNum = Number(branchIdRaw);
        const branch_id = Number.isFinite(branchIdNum) && branchIdNum > 0 ? branchIdNum : null;

        const items = Array.isArray(a?.items) ? a.items : [];
        for (const it of items) {
            const productIdRaw = it?.id ?? it?.productId ?? it?.product_id ?? null;
            const productIdNum = Number(productIdRaw);
            if (!Number.isFinite(productIdNum) || productIdNum <= 0) continue;

            const qtyRaw = it?.orderQty ?? it?.qtyBoxes ?? it?.qty ?? 0;
            const qtyNum = Number(qtyRaw);
            const ordered_quantity = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1;

            const unitPrice = Number(it?.price ?? it?.pricePerBox ?? it?.unit_price ?? 0) || 0;
            const lineTotal = ordered_quantity * unitPrice;

            if (!branch_id) {
                throw new Error(
                    `Missing branch_id for product_id=${productIdNum}. Check allocations[].branchId in payload.`
                );
            }

            lines.push({
                purchase_order_id: poId,
                branch_id,
                product_id: productIdNum,
                ordered_quantity,
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

async function createManyPurchaseOrderProducts(base: string, lines: Record<string, unknown>[]) {
    const url = `${base}/items/purchase_order_products`;

    let r = await directusFetch(url, { method: "POST", body: JSON.stringify(lines) });
    let parsed = await safeJson(r);

    if (r.ok) return { ok: true, json: parsed.json };

    r = await directusFetch(url, { method: "POST", body: JSON.stringify({ data: lines }) });
    parsed = await safeJson(r);

    if (r.ok) return { ok: true, json: parsed.json };

    const msg =
        parsed.json?.errors?.[0]?.message ||
        parsed.json?.error ||
        `Failed to create purchase_order_products (${r.status})`;

    return { ok: false, json: parsed.json, message: msg, status: r.status };
}

async function ensurePoProducts(base: string, poId: number, input: Record<string, unknown>) {
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

    const data = result.json?.data;
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

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();

        const body = await req.json().catch(() => null);
        const input = (body?.data ?? body?.payload ?? body) || {};

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
                } catch (e: unknown) {
                    const error = e as Error;
                    return NextResponse.json(
                        {
                            error: "PO exists but failed to create missing PO product lines",
                            details: error.message,
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

        const gross_amount = numOrZero(input?.gross_amount ?? input?.grossAmount ?? input?.subtotal);
        const discounted_amount = numOrZero(input?.discounted_amount ?? input?.discountAmount ?? input?.discount);
        const vat_amount = numOrZero(input?.vat_amount ?? input?.vatAmount ?? input?.vat ?? input?.tax);
        const total_amount = numOrZero(input?.total_amount ?? input?.totalAmount ?? input?.total);
        const withholding_tax_amount = numOrZero(
            input?.withholding_tax_amount ?? input?.ewtGoods ?? input?.ewt_goods
        );

        const date = isoDateOnlyFrom(input?.date ?? input?.poDateISO ?? input?.poDate);
        const date_encoded = isoDateTimeFrom(input?.date_encoded ?? input?.dateEncoded ?? now());
        const datetime = isoDateTimeFrom(input?.datetime ?? input?.dateTime ?? now());
        const time = String(input?.time ?? timeHHMMSSFrom(now()));

        const payment_type = intOrDefault(input?.payment_type ?? input?.paymentType, 0);
        const payment_status = intOrDefault(input?.payment_status ?? input?.paymentStatus, 2);
        const transaction_type = intOrDefault(input?.transaction_type ?? input?.transactionType, 1);
        
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

        const payload: Record<string, unknown> = {
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

            branch_id: input?.branch_id ?? input?.branchId ?? null,
            price_type_id: input?.price_type_id ?? null,

            // ✅ User relationship & discount fields
            encoder_id: input?.encoder_id ?? input?.encoderId ?? null,
            discount_type: input?.discount_type ?? input?.discountType ?? input?.discountTypeId ?? null,
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
        const createdPoId = extractPoId(created as Record<string, unknown>);

        if (createdPoId) {
            try {
                const linesMeta = await ensurePoProducts(base, createdPoId, input);

                return NextResponse.json({
                    data: created,
                    meta: { alreadyExists: false, purchase_order_no: poNumber, po_products: linesMeta },
                });
            } catch (e: unknown) {
                const error = e as Error;
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
                        details: error.message,
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
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json(
            { error: "Failed to save purchase order", details: error.message },
            { status: 500 }
        );
    }
}
