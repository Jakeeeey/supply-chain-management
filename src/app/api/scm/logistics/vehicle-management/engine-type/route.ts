import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const ENDPOINT = "/items/vehicle_engine_type";

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

async function proxyRequest(req: NextRequest, method: string) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);
  if (!ACCESS_TOKEN) return json({ error: "Missing Token" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "12";
  const search = url.searchParams.get("search") ?? "";

  let upstreamUrl = `${DIRECTUS_URL}${ENDPOINT}`;

  if (id) {
    upstreamUrl += `/${id}`;
  } else if (method === "GET") {
    upstreamUrl += `?sort=-id&page=${page}&limit=${limit}&meta=filter_count`;

    if (search) {
      const filter = {
        _or: [
          { name: { _icontains: search } },
          { description: { _icontains: search } },
        ],
      };
      upstreamUrl += `&filter=${encodeURIComponent(JSON.stringify(filter))}`;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  const options: RequestInit = { method, headers, cache: "no-store" };

  if (["POST", "PATCH"].includes(method)) {
    const body = await req.json().catch(() => ({}));
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(upstreamUrl, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(data, response.status);
    }

    return json(data, 200);
  } catch (error: any) {
    return json({ error: error.message }, 500);
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}
export async function POST(req: NextRequest) {
  return proxyRequest(req, "POST");
}
export async function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH");
}
