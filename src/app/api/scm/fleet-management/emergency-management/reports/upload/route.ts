import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const mime = String(file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP, HEIC." },
        { status: 400 }
      );
    }

    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
    }

    const directusForm = new FormData();
    directusForm.append("file", file);

    const res = await fetch(`${DIRECTUS_BASE}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      body: directusForm,
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({ message: "Directus upload failed" }));
      return NextResponse.json(detail, { status: res.status });
    }

    const data = (await res.json()) as { data?: { id?: string } };
    return NextResponse.json({ data: { id: data?.data?.id } });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: String(err?.message ?? e) }, { status: 500 });
  }
}
