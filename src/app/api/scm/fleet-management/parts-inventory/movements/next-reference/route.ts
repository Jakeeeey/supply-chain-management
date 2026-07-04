import { NextRequest, NextResponse } from "next/server";
import {
  NextMovementReferenceQuerySchema,
  generateMovementReference,
  parseQuery,
} from "../../_service";
import { jsonError, requirePartsInventoryAuth } from "../../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = parseQuery(NextMovementReferenceQuerySchema, searchParams);
    return NextResponse.json({ data: { referenceNo: generateMovementReference(query.movementType) } });
  } catch (error) {
    return jsonError(error);
  }
}
