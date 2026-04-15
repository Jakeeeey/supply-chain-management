import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const ENDPOINT = "/items/fuel_type";

function json(res: unknown, status = 200) {
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  // Check for duplicates before creating or updating
  if (["POST", "PATCH"].includes(method)) {
    const body = await req.json().catch(() => ({}));
    const name = body.name;

    if (name) {
      // Check if a record with the same name exists
      const checkUrl = `${DIRECTUS_URL}${ENDPOINT}?filter=${encodeURIComponent(
        JSON.stringify({ name: { _eq: name } })
      )}`;

      const checkResponse = await fetch(checkUrl, {
        headers,
        cache: "no-store",
      });

      const checkData = await checkResponse.json().catch(() => ({ data: [] }));
      const existingRecords = checkData?.data || [];

      // If updating, filter out the current record
      const duplicates = id
        ? existingRecords.filter((r: { id: number }) => r.id !== parseInt(id))
        : existingRecords;

      if (duplicates.length > 0) {
        return json({ error: "UNIQUE constraint failed: name already exists" }, 400);
      }
    }

    if (id) {
      upstreamUrl += `/${id}`;
    }

    const options: RequestInit = {
      method,
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    };

    try {
      const response = await fetch(upstreamUrl, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return json(data, response.status);
      }

      return json(data, 200);
    } catch (error: unknown) {
      const err = error as Error;
      return json({ error: err.message }, 500);
    }
  }

  // GET request
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

  const options: RequestInit = { method, headers, cache: "no-store" };

  try {
    const response = await fetch(upstreamUrl, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(data, response.status);
    }

    return json(data, 200);
  } catch (error: unknown) {
    const err = error as Error;
    return json({ error: err.message }, 500);
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
