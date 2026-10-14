import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function directusHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "-1";

    const upstream = `${DIRECTUS_URL}/items/branches?limit=${encodeURIComponent(limit)}&sort=branch_name`;
    const res = await fetch(upstream, {
      headers: directusHeaders(),
      cache: "no-store",
    });

    const body = await res.json().catch(() => ({ data: [] }));
    return json(body, res.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
