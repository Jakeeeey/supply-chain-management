import { NextRequest, NextResponse } from "next/server";
import { listLookups } from "../_service";
import { jsonError, requirePartsInventoryAuth } from "../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    return NextResponse.json(await listLookups());
  } catch (error) {
    return jsonError(error);
  }
}
