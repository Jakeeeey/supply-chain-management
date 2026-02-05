import { NextRequest, NextResponse } from "next/server";

function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        process.env.DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    if (raw.includes("100.110.197.61:8056") && raw.startsWith("https://")) {
        return raw.replace(/^https:\/\//, "http://");
    }

    return raw;
}

export async function GET(req: NextRequest) {
    try {
        const DIRECTUS_URL = getDirectusBase();
        const TOKEN = process.env.DIRECTUS_TOKEN;

        const { searchParams } = new URL(req.url);
        const idsParam = searchParams.get("ids") || "";

        const safeIds = idsParam
            .split(",")
            .map((s) => s.trim())
            .filter((s) => /^\d+$/.test(s))
            .join(",");

        let url = `${DIRECTUS_URL.replace(/\/$/, "")}/items/products?limit=-1`;
        if (safeIds) url += `&filter[product_id][_in]=${safeIds}`;

        const headers: Record<string, string> = {};
        if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

        const res = await fetch(url, { headers, cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to fetch products", url, details: json },
                { status: res.status }
            );
        }

        return NextResponse.json(json);
    } catch (e: any) {
        return NextResponse.json(
            { error: "Products API crashed", message: e?.message || String(e) },
            { status: 500 }
        );
    }
}
