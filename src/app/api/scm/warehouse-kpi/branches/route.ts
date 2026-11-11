import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const spring = process.env.SPRING_API_BASE_URL;
  const directus = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
  if (!spring || !directus || !staticToken) {
    return NextResponse.json({ message: "Branch lookup is not configured." }, { status: 503 });
  }
  try {
    // Validate the session before querying Directus with service credentials.
    const session = await fetch(`${spring.replace(/\/+$/, "")}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!session.ok) {
      return NextResponse.json({ message: session.status === 401 || session.status === 403 ? "Authentication required." : "Session service unavailable." }, { status: session.status === 401 || session.status === 403 ? session.status : 502 });
    }
    const url = new URL(`${directus.replace(/\/+$/, "")}/items/branches`);
    url.search = new URLSearchParams({ fields: "id,branch_name,branch_code", limit: "-1", sort: "branch_name" }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${staticToken}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Branch lookup failed.");
    const result = await response.json();
    if (!Array.isArray(result.data)) throw new Error("Invalid branch response.");
    const branches = result.data.map((row: { id: number | string; branch_name?: string | null; branch_code?: string | null }) => ({
      id: String(row.id),
      name: row.branch_name?.trim() || row.branch_code?.trim() || `Branch #${row.id}`,
    }));
    return NextResponse.json({ branches }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Unable to load branches. Please retry." }, { status: 502 });
  }
}
