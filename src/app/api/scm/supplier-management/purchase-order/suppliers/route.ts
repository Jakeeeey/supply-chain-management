import { NextResponse } from "next/server";

function getDirectusBase() {
    const raw =
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        process.env.DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    // If your env accidentally uses https for this host, force http
    if (raw.includes("100.110.197.61:8056") && raw.startsWith("https://")) {
        return raw.replace(/^https:\/\//, "http://");
    }

    return raw;
}

export async function GET() {
    try {
        const DIRECTUS_URL = getDirectusBase();
        const TOKEN = process.env.DIRECTUS_TOKEN;

        const url = `${DIRECTUS_URL.replace(/\/$/, "")}/items/suppliers?limit=-1`;

        const headers: Record<string, string> = {};
        if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

        const res = await fetch(url, { headers, cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to fetch suppliers", url, details: json },
                { status: res.status }
            );
        }

        return NextResponse.json(json);
    } catch (e: any) {
        return NextResponse.json(
            { error: "Suppliers API crashed", message: e?.message || String(e) },
            { status: 500 }
        );
    }
}
