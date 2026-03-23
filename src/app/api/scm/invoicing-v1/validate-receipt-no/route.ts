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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const receiptNo = searchParams.get("receiptNo");
        
        if (!receiptNo) {
            return NextResponse.json({ error: "Receipt number is required" }, { status: 400 });
        }

        const url = `${DIRECTUS_BASE}/items/sales_invoice?filter[invoice_no][_eq]=${encodeURIComponent(receiptNo)}&fields=invoice_id&limit=1`;
        
        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to validate receipt number" }, { status: response.status });
        }

        const data = await response.json();
        const exists = data.data && data.data.length > 0;

        return NextResponse.json({ exists });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
