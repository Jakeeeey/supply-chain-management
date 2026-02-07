//src/app/api/vehicle-management/vehicle-list/users/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function authHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_STATIC_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_STATIC_TOKEN}`;
  return h;
}

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

    // minimal fields needed for driver display
    const fields = ["user_id", "user_fname", "user_lname", "user_email", "role", "user_image"].join(",");

    const upstreamUrl = new URL(`${DIRECTUS_URL}/items/user`);
    upstreamUrl.searchParams.set("limit", limit);
    upstreamUrl.searchParams.set("fields", fields);

    const upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: authHeaders(),
    });

    const body = await readUpstream(upstream);
    return NextResponse.json(body, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
