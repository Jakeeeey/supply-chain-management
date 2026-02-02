// src/app/api/vehicle-management/vehicle-list/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

async function readUpstream(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  return { ct, body };
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "-1";

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicles?limit=${encodeURIComponent(limit)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    const { body } = await readUpstream(upstream);
    return json(body, upstream.status);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json().catch(() => ({}));

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicles`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const { body } = await readUpstream(upstream);
    return json(body, upstream.status);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
