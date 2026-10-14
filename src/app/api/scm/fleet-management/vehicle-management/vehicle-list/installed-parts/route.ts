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
    const vehicleId = url.searchParams.get("vehicle_id");
    const limit = url.searchParams.get("limit") ?? "-1";

    let endpoint = `${DIRECTUS_URL}/items/vehicle_installed_parts?limit=${encodeURIComponent(limit)}&fields=*,part_id.*`;
    if (vehicleId) {
      endpoint += `&filter[vehicle_id][_eq]=${encodeURIComponent(vehicleId)}`;
    }

    const upstream = await fetch(endpoint, {
      cache: "no-store",
      headers: directusHeaders(),
    });

    const body = await upstream.json().catch(() => ({ data: [] }));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json().catch(() => ({}));

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
      method: "POST",
      cache: "no-store",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
