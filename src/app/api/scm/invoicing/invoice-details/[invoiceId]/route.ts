import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const resolvedParams = await params;
        const invoiceId = resolvedParams.invoiceId;
        
        if (!invoiceId || invoiceId === "null" || invoiceId === "undefined") {
            return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
        }

        // Fetch sales_invoice_details joined with products for name and unit
        const fields = "*,product_id.product_id,product_id.product_name,product_id.unit_of_measurement.unit_shortcut"; 

        const url = `${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=${fields}&limit=-1`;

        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DEBUG] Directus error (${response.status}):`, errorText);
            return NextResponse.json({ error: "Failed to fetch invoice details", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const details = (data.data || []).map((d: any) => ({
            detail_id: d.detail_id,
            order_id: d.order_id,
            invoice_no: d.invoice_no,
            product_id: d.product_id?.product_id ?? d.product_id,
            product_name: d.product_id?.product_name ?? d.product_name ?? "Unknown Product",
            unit_shortcut: d.product_id?.unit_of_measurement?.unit_shortcut ?? d.unit ?? "N/A",
            unit_price: d.unit_price,
            quantity: d.quantity,
            discount_type: d.discount_type ?? null,
            discount_amount: d.discount_amount ?? 0,
            gross_amount: d.gross_amount ?? 0,
            total_amount: d.total_amount ?? 0,
        }));

        return NextResponse.json(details);
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
