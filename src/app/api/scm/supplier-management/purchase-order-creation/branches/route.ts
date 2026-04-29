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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamHeaders(): Record<string, string> {
    return directusHeaders();
}

export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const url = new URL(req.url);
        const limit = url.searchParams.get("limit") ?? "-1";

        const upstream = `${base}/items/branches?limit=${encodeURIComponent(limit)}`;

        const res = await fetch(upstream, {
            headers: buildUpstreamHeaders(),
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Upstream branches fetch failed", details: json },
                { status: res.status }
            );
        }

        return NextResponse.json({ data: json.data ?? [] });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json(
            { error: "Branches route failed", details: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
