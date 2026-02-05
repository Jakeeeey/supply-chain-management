import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const DIRECTUS_URL =
            process.env.NEXT_PUBLIC_DIRECTUS_URL ||
            process.env.DIRECTUS_URL ||
            "http://100.110.197.61:8056";

        const TOKEN = process.env.DIRECTUS_TOKEN; // optional

        const url = `${DIRECTUS_URL}/items/discount_type?limit=-1&fields=id,discount_type,total_percent`;

        const res = await fetch(url, {
            cache: "no-store",
            headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return NextResponse.json(
                { error: `Directus error ${res.status} ${res.statusText}`, details: text },
                { status: 500 }
            );
        }

        const json = await res.json();
        return NextResponse.json({ data: json?.data ?? [] });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to fetch discount types", details: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
