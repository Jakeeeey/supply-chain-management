import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function authHeaders(req: NextRequest) {
  // prefer env static token; fallback to cookie token if you use vos_access_token
  const cookieToken = req.cookies.get("vos_access_token")?.value;
  const token = DIRECTUS_STATIC_TOKEN || cookieToken;

  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function readUpstream(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  return { ct, body };
}

function isForbiddenFieldsError(body: any) {
  const msg = String(body?.errors?.[0]?.message || "").toLowerCase();
  return msg.includes("don't have permission") || msg.includes("forbidden");
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "-1";
    const vehicleId = url.searchParams.get("vehicle_id");

    // FULL fields (what we want if permissions allow)
    const fullFields = [
      "id",
      "doc_no",
      "vehicle_id",
      "driver_id",
      "status",
      "date_encoded",
      "estimated_time_of_dispatch",
      "estimated_time_of_arrival",
      "time_of_dispatch",
      "time_of_arrival",
      "total_distance",
      "starting_point",
      "destination_point",
      "ending_point",
      "origin",
      "destination",
      "route",
      "remarks",
    ].join(",");

    // SAFE fields (guaranteed useful even if route fields are forbidden)
    const safeFields = [
      "id",
      "doc_no",
      "vehicle_id",
      "driver_id",
      "status",
      "date_encoded",
      "estimated_time_of_dispatch",
      "estimated_time_of_arrival",
      "time_of_dispatch",
      "time_of_arrival",
      "total_distance",
      "starting_point",
      "remarks",
    ].join(",");

    const makeUrl = (fields: string) => {
      const upstreamUrl = new URL(`${DIRECTUS_URL}/items/post_dispatch_plan`);
      upstreamUrl.searchParams.set("limit", limit);
      upstreamUrl.searchParams.set("fields", fields);
      upstreamUrl.searchParams.set("sort", "-date_encoded,-id");

      if (vehicleId && String(vehicleId).trim().length) {
        upstreamUrl.searchParams.set("filter[vehicle_id][_eq]", String(vehicleId).trim());
      }

      return upstreamUrl.toString();
    };

    // 1st attempt: full fields
    const r1 = await fetch(makeUrl(fullFields), {
      cache: "no-store",
      headers: authHeaders(req),
    });
    const j1 = await readUpstream(r1);

    // If forbidden because of fields, retry with safe fields (so Trips still works)
    if (!r1.ok && isForbiddenFieldsError(j1.body)) {
      const r2 = await fetch(makeUrl(safeFields), {
        cache: "no-store",
        headers: authHeaders(req),
      });
      const j2 = await readUpstream(r2);
      return NextResponse.json(j2.body, { status: r2.status });
    }

    return NextResponse.json(j1.body, { status: r1.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
