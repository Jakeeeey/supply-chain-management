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
        const url = `${DIRECTUS_BASE}/items/sales_invoice_type?sort=type`;
        
        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to fetch invoice types", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data.data || []);
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
