import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not configured" },
        { status: 500 }
      );
    }

    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    if (DIRECTUS_TOKEN) {
      headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    const upstreamUrl = `${DIRECTUS_BASE}/assets/${encodeURIComponent(id)}`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch asset from Directus (status: ${upstreamRes.status})` },
        { status: upstreamRes.status }
      );
    }

    const contentType =
      upstreamRes.headers.get("content-type") || "application/octet-stream";
    const body = await upstreamRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

