//src/app/api/vehicle-management/vehicle-list/dispatch-plans/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function authHeaders(req: NextRequest) {
  // Prefer static token (service/admin). Fallback to cookie token if present.
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

function isForbiddenFieldsError(body: Record<string, unknown>) {
  const errors = body?.errors as Array<{ message?: string }> | undefined;
  const msg = String(errors?.[0]?.message || "").toLowerCase();
  return msg.includes("don't have permission") || msg.includes("forbidden");
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "-1";
    const vehicleId = url.searchParams.get("vehicle_id");

    // FULL fields (best-case if permissions allow)
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

    // SAFE fields (fallback when forbidden)
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

    // 1) try full
    const r1 = await fetch(makeUrl(fullFields), {
      cache: "no-store",
      headers: authHeaders(req),
    });
    const j1 = await readUpstream(r1);

    // 2) retry safe if forbidden fields
    if (!r1.ok && isForbiddenFieldsError(j1.body)) {
      const r2 = await fetch(makeUrl(safeFields), {
        cache: "no-store",
        headers: authHeaders(req),
      });
      const j2 = await readUpstream(r2);
      return NextResponse.json(j2.body, { status: r2.status });
    }

    return NextResponse.json(j1.body, { status: r1.status });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
