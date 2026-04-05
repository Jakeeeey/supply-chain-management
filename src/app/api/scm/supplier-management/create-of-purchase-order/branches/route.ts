import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusHeaders } from "@/lib/directus";

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
