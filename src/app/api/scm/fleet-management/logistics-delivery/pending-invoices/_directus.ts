import { NextResponse } from "next/server";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

if (!NEXT_PUBLIC_API_BASE_URL) {
  console.error("Missing NEXT_PUBLIC_API_BASE_URL in .env.local");
}

export type DirectusListResponse<T> = {
  data: T[];
  meta?: { total_count?: number; filter_count?: number };
};

export function directusUrl(path: string, params?: Record<string, string>) {
  const base = NEXT_PUBLIC_API_BASE_URL || "";
  const url = new URL(`${base}${path.startsWith("/") ? "" : "/"}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export async function directusGet<T>(path: string, params?: Record<string, string>) {
  const url = directusUrl(path, params);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (DIRECTUS_STATIC_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_STATIC_TOKEN}`;

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: "Directus request failed", status: res.status, url, details: text }, { status: 500 });
  }
  return (await res.json()) as T;
}

export function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
