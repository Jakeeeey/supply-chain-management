import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reports = new Set(["summary", "inventory-accuracy", "picking-accuracy", "stocking-level-accuracy", "receiving-accuracy", "loading-readiness", "location-compliance", "housekeeping", "sop-safety", "damage-loss"]);
const branchIdPattern = /^\d+$/;

function parseBranchIds(searchParams: URLSearchParams): { branchIds: string[]; error?: { status: number; message: string } } {
  const values = searchParams.getAll("branchId").map(v => v.trim()).filter(Boolean);
  if (values.length === 0) return { branchIds: [] };
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    if (!branchIdPattern.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      return { branchIds: [], error: { status: 400, message: "branchId must be positive integers." } };
    }
    if (seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return { branchIds: ids };
}

function isDateOnly(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) === 0) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { path } = await context.params;
  if (path.some(segment => !/^[a-zA-Z0-9-]+$/.test(segment))) {
    return NextResponse.json({ message: "Invalid route." }, { status: 400 });
  }
  if (!reports.has(path[0])) {
    return NextResponse.json({ message: "Unknown warehouse endpoint." }, { status: 404 });
  }
  if (req.method !== "GET") return NextResponse.json({ message: "Read-only endpoint." }, { status: 405 });
  const base = process.env.SPRING_API_BASE_URL;
  if (!base) return NextResponse.json({ message: "Spring backend is not configured." }, { status: 503 });
  const upstreamPath = `/api/bia/warehouse-kpi/${path.join("/")}`;
  const url = new URL(`${base.replace(/\/$/, "")}${upstreamPath}`);
  url.search = req.nextUrl.search;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const branchValidation = parseBranchIds(url.searchParams);
  if (branchValidation.error) {
    return NextResponse.json({ message: branchValidation.error.message }, { status: branchValidation.error.status });
  }
  if (url.searchParams.getAll("from").length !== 1 || url.searchParams.getAll("to").length !== 1 || !isDateOnly(from) || !isDateOnly(to)) {
    return NextResponse.json({ message: "Provide exactly one from and to date, each a real date in YYYY-MM-DD format with a positive year." }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ message: "From date must be on or before to date." }, { status: 400 });
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    return new NextResponse(response.status === 204 ? null : await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ message: "Warehouse service is unavailable or timed out. Please retry." }, { status: 502 });
  }
}

export { proxy as GET };
