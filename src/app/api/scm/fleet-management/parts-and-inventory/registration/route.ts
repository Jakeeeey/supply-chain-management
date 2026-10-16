import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function getUserIdFromRequest(req: NextRequest): number | null {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const rawId = payload?.user_id ?? payload?.id ?? payload?.sub;
    const num = Number(rawId);
    return isNaN(num) || num <= 0 ? null : num;
  } catch {
    return null;
  }
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
    const search = url.searchParams.get("search");
    const classificationId = url.searchParams.get("classification_id");
    const status = url.searchParams.get("status");

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-created_at");
    // Expand classification relation
    params.set("fields", "*,classification_id.*");

    if (search) {
      params.set("filter[_or][0][part_code][_icontains]", search);
      params.set("filter[_or][1][part_name][_icontains]", search);
      params.set("filter[_or][2][barcode][_icontains]", search);
      params.set("filter[_or][3][classification_id][name][_icontains]", search);
      params.set("filter[_or][4][classification_id][barcode][_icontains]", search);
    }

    if (classificationId && classificationId !== "all") {
      params.set("filter[classification_id][_eq]", classificationId);
    }

    if (status && status !== "all") {
      params.set("filter[is_active][_eq]", status === "active" ? "true" : "false");
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts?${params.toString()}`;

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

    const payload = await req.json();
    const userId = getUserIdFromRequest(req);

    const postData = {
      ...payload,
      ...(userId ? { created_by: userId } : {}),
    };

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts?fields=*,classification_id.*`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(postData),
    });

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { id, ...updateData } = payload;

    if (!id) {
      return json({ error: "Missing part ID" }, 400);
    }

    const userId = getUserIdFromRequest(req);
    const patchData = {
      ...updateData,
      ...(userId ? { updated_by: userId } : {}),
    };

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts/${id}?fields=*,classification_id.*`;
    const upstream = await fetch(endpoint, {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify(patchData),
    });

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing part ID" }, 400);
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts/${id}`;
    const upstream = await fetch(endpoint, {
      method: "DELETE",
      headers: directusHeaders(),
    });

    if (upstream.status === 204) {
      return json({ success: true }, 200);
    }

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
