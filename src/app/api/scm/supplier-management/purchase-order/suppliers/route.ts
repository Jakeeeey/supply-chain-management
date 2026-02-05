import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDirectusBase() {
    const raw =
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    // ensure has scheme
    if (!/^https?:\/\//i.test(raw)) return `http://${raw}`;
    return raw.replace(/\/$/, "");
}

function buildUpstreamHeaders(req: NextRequest) {
    const h: Record<string, string> = { "Content-Type": "application/json" };

    // Prefer explicit env token if present
    const envToken = process.env.DIRECTUS_TOKEN;
    if (envToken) {
        h.Authorization = `Bearer ${envToken}`;
        return h;
    }

    // Otherwise forward incoming Authorization if present
    const incomingAuth = req.headers.get("authorization");
    if (incomingAuth) h.Authorization = incomingAuth;

    return h;
}

export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const url = new URL(req.url);
        const limit = url.searchParams.get("limit") ?? "-1";

        const upstream = `${base}/items/suppliers?limit=${encodeURIComponent(limit)}`;

        const res = await fetch(upstream, {
            headers: buildUpstreamHeaders(req),
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Upstream suppliers fetch failed", details: json },
                { status: res.status }
            );
        }

        return NextResponse.json({ data: json.data ?? [] });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Suppliers route failed", details: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
