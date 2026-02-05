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

export async function POST(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const TOKEN = process.env.DIRECTUS_TOKEN;

        const body = await req.json().catch(() => null);

        if (!body?.supplierId || !body?.poNumber) {
            return NextResponse.json(
                { error: "Missing required fields: supplierId, poNumber" },
                { status: 400 }
            );
        }

        // ✅ You can adjust these field names to match your Directus collection schema
        const payload = {
            po_number: String(body.poNumber),
            po_date: body.poDate ? String(body.poDate) : new Date().toISOString(),
            supplier_id: String(body.supplierId),

            status: "FOR_APPROVAL",

            subtotal: Number(body.subtotal ?? 0),
            discount: Number(body.discount ?? 0),
            vat: Number(body.vat ?? body.tax ?? 0),
            total: Number(body.total ?? 0),

            // store details (if you have JSON fields)
            allocations: body.allocations ?? [],
            items: body.items ?? [],
        };

        const upstream = `${base}/items/purchase_order`;

        const res = await fetch(upstream, {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Directus create purchase_order failed", details: json },
                { status: res.status }
            );
        }

        return NextResponse.json({ data: json?.data ?? json });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to save purchase order", details: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
