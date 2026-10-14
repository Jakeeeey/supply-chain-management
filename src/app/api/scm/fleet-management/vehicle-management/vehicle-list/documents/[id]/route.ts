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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const { id } = await ctx.params;
    const payload = await req.json().catch(() => ({}));

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_documents/${id}`, {
      method: "PATCH",
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const { id } = await ctx.params;

    // soft delete or hard delete in directus
    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_documents/${id}`, {
      method: "PATCH",
      cache: "no-store",
      headers: directusHeaders(),
      body: JSON.stringify({ is_deleted: 1 }),
    });

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
