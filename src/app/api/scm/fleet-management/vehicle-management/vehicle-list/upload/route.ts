import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function directusHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { ...extra };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus API base URL is not configured." },
        { status: 500 }
      );
    }

    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Size guard (5MB)
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    // Type guard
    const mime = String(file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP." },
        { status: 400 }
      );
    }

    // Forward multipart directly to Directus /files storage
    const directusForm = new FormData();
    directusForm.append("file", file);

    const upstreamRes = await fetch(`${DIRECTUS_BASE}/files`, {
      method: "POST",
      headers: directusHeaders(),
      body: directusForm,
    });

    if (!upstreamRes.ok) {
      const detail = await upstreamRes
        .json()
        .catch(() => ({ message: "Directus file upload failed" }));
      return NextResponse.json(detail, { status: upstreamRes.status });
    }

    const result = (await upstreamRes.json()) as { data?: { id?: string } };
    const fileId = result?.data?.id;

    if (!fileId) {
      return NextResponse.json(
        { error: "Directus file upload succeeded but no file ID was returned." },
        { status: 500 }
      );
    }

    // Return the Directus asset ID
    return NextResponse.json({ data: { path: fileId, id: fileId } }, { status: 200 });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
