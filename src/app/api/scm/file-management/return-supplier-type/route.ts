import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "../../../../../modules/supply-chain-management/file-management/return-supplier-type/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const ENDPOINT = "/items/rts_return_type";

function json(
  res: Record<string, unknown> | unknown[] | { error: string; details?: string | object },
  status = 200,
) {
  return NextResponse.json(res, { status });
}

interface UserRow {
  user_id?: string | number;
  id?: string | number;
  user_fname?: string;
  first_name?: string;
  user_lname?: string;
  last_name?: string;
  user_email?: string;
  email?: string;
  name?: string;
  full_name?: string;
}

async function resolveUserNames(
  userIds: number[],
): Promise<Map<number, string>> {
  const userMap = new Map<number, string>();
  if (!userIds.length) return userMap;

  try {
    const ids = [...new Set(userIds)].join(",");
    
    // 1. Try fetching from custom /items/user table
    const params = new URLSearchParams({
      fields: "*",
      "filter[user_id][_in]": ids,
      limit: "-1"
    });

    const res = await fetch(`${DIRECTUS_URL}/items/user?${params.toString()}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      cache: "no-store",
    });

    let rows: UserRow[] = [];
    if (res.ok) {
      const jsonResponse = await res.json();
      rows = jsonResponse?.data ?? [];
    }

    const foundIds = new Set(rows.map(r => Number(r.user_id ?? r.id)));
    const missingIds = userIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      const fallbackParams = new URLSearchParams({
        fields: "*",
        "filter[id][_in]": missingIds.join(","),
        limit: "-1"
      });
      const fallbackRes = await fetch(`${DIRECTUS_URL}/users?${fallbackParams.toString()}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        cache: "no-store",
      });

      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const fallbackRows: Record<string, unknown>[] = fallbackJson?.data ?? [];
        fallbackRows.forEach((fr) => {
          rows.push({
            user_id: fr.id as string | number,
            user_fname: fr.first_name as string,
            user_lname: fr.last_name as string,
            user_email: fr.email as string
          });
        });
      }
    }

    rows.forEach((u) => {
      const uId = u.user_id ?? u.id;
      const fname = u.user_fname ?? u.first_name ?? "";
      const lname = u.user_lname ?? u.last_name ?? "";
      const email = u.user_email ?? u.email ?? "";
      const alternateName = u.name ?? u.full_name ?? "";
      
      const nameParts = [fname, lname].filter(Boolean);
      let fullName = nameParts.join(" ");

      if (!fullName || !fullName.trim()) {
          fullName = alternateName || email || `${uId}`;
      }

      userMap.set(Number(uId), fullName);
    });
  } catch (error) {
    console.error('Failed to resolve users:', error);
  }

  if (!userMap.has(1)) {
      userMap.set(1, "System Admin");
  }

  return userMap;
}

async function proxyRequest(req: NextRequest, method: string) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);
  if (!ACCESS_TOKEN) return json({ error: "Missing Token" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "10";
  const search = url.searchParams.get("search") ?? "";

  let upstreamUrl = `${DIRECTUS_URL}${ENDPOINT}`;

  if (id) {
    upstreamUrl += `/${id}`;
  } else if (method === "GET") {
    upstreamUrl += `?fields=*&sort=-created_at&page=${page}&limit=${limit}&meta=filter_count`;

    if (search) {
      const filter = {
        _or: [
          { return_type_name: { _icontains: search } },
          { return_type_code: { _icontains: search } },
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
    
    // Check if the response is JSON
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const errorText = await response.text();
      return json({ error: errorText || `HTTP ${response.status}: ${response.statusText}` }, response.status);
    }

    const dataResponse = await response.json().catch(() => null);

    if (!response.ok) {
      return json(dataResponse || { error: `HTTP ${response.status}: ${response.statusText}` }, response.status);
    }

    // For GET list responses, resolve user IDs → names
    if (method === "GET" && !id && Array.isArray(dataResponse?.data)) {
      const rows = dataResponse.data as Record<string, unknown>[];

      const rawIds = rows.flatMap((r) => [
        r.created_by, r.updated_by, 
        r.user_created, r.user_updated
      ]).filter((val): val is number | string => !!val);
      
      const userIds = [...new Set(rawIds.map((id) => Number(id)))].filter((id) => !isNaN(id));

      const userMap = await resolveUserNames(userIds);

      dataResponse.data = rows.map((row) => {
        const cb = row.created_by ?? row.user_created;
        const ub = row.updated_by ?? row.user_updated;

        return {
          ...row,
          created_by_name: cb ? (userMap.get(Number(cb)) ?? `${cb}`) : null,
          updated_by_name: ub ? (userMap.get(Number(ub)) ?? `${ub}`) : null,
        };
      });
    }

    return json(dataResponse, 200);
  } catch (error: unknown) {
    return json({ error: (error as Error).message }, 500);
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req, "GET"); }
export async function POST(req: NextRequest) { return proxyRequest(req, "POST"); }
export async function PATCH(req: NextRequest) { return proxyRequest(req, "PATCH"); }
export async function DELETE(req: NextRequest) { return proxyRequest(req, "DELETE"); }
