//src/app/api/scm/vehicle-management/vehicle-list/engine-type/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function readUpstream(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  return isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "-1";

    const upstream = await fetch(
      `${DIRECTUS_URL}/items/vehicle_engine_type?limit=${encodeURIComponent(limit)}`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }
    );

    const body = await readUpstream(upstream);
    return NextResponse.json(body, { status: upstream.status });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
