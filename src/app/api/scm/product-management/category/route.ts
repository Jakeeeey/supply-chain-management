import { NextRequest, NextResponse } from "next/server";
/**
 * JWT Utility for decoding payloads without verification
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const p = parts[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    // Use Buffer for Node.js environments (API routes)
    if (typeof Buffer !== 'undefined') {
      const json = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(json);
    }
    
    // Fallback for browser if needed
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract User ID from JWT Payload
 */
function getUserIdFromToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Try common ID fields
  const idValue = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;
  
  if (idValue !== undefined && idValue !== null) {
    const num = Number(idValue);
    return isNaN(num) ? null : num;
  }

  return null;
}

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const ENDPOINT = "/items/categories";

function json(res: Record<string, unknown> | unknown[] | { error: string; details?: string }, status = 200) {
  return NextResponse.json(res, { status });
}

async function proxyRequest(req: NextRequest, method: string) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);
  if (!ACCESS_TOKEN) return json({ error: "Missing Token" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // ✅ Capture Pagination & Search Params
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "12";
  const search = url.searchParams.get("search") ?? "";
  const filterParam = url.searchParams.get("filter") ?? "";

  let upstreamUrl = `${DIRECTUS_URL}${ENDPOINT}`;

  if (id) {
    upstreamUrl += `/${id}`;
  } else if (method === "GET") {
    // ✅ Include params and request meta count
    upstreamUrl += `?sort=category_name&page=${page}&limit=${limit}&meta=filter_count`;

    // ✅ Apply filter directly if provided, otherwise fallback to search logic
    if (filterParam) {
      upstreamUrl += `&filter=${encodeURIComponent(filterParam)}`;
    } else if (search) {
      const filter = {
        _or: [
          { category_name: { _icontains: search } },
          { sku_code: { _icontains: search } },
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
    
    // Inject user ID for audit trails
    const token = req.cookies.get("vos_access_token")?.value;
    const userId = getUserIdFromToken(token);
    
    if (userId) {
      if (method === "POST") {
        body.created_by = userId;
      } else if (method === "PATCH") {
        body.updated_by = userId;
      }
    }

    options.body = JSON.stringify(body);
  }

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
