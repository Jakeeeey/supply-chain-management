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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const orderId = resolvedParams.id;
        
        if (!orderId) {
            return NextResponse.json({ error: "Missing sales order ID" }, { status: 400 });
        }

        const body = await req.json();
        const { remarks } = body;

        // Note: we might only want to allow updating remarks, so we explicitly map it.
        const updatePayload = {
            remarks: remarks
        };

        const url = `${DIRECTUS_BASE}/items/sales_order/${orderId}`;
        
        const response = await fetch(url, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to update sales order remarks", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
