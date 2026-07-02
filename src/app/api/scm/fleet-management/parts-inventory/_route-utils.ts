import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import { toApiError } from "./_service";

export function jsonError(error: unknown) {
  const apiError = toApiError(error);
  return NextResponse.json(apiError.body, { status: apiError.status });
}

export function actorIdFromRequest(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return null;

  const numeric = Number(payload.sub);
  return Number.isFinite(numeric) ? numeric : payload.sub;
}

export function requirePartsInventoryAuth(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return null;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
