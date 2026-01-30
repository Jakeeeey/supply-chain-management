import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function authHeaders() {
  const h = new Headers();
  if (DIRECTUS_STATIC_TOKEN) h.set("Authorization", `Bearer ${DIRECTUS_STATIC_TOKEN}`);
  return h;
}

async function readUpstream(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
  return { ct, body };
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // rebuild formdata for upstream
    const fd = new FormData();
    fd.set("file", file, file.name);

    const upstream = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(), // don't set content-type for multipart
      body: fd,
    });

    const { body } = await readUpstream(upstream);
    return NextResponse.json(body, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
