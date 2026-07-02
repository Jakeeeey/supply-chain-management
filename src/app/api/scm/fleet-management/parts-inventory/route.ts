import { NextRequest, NextResponse } from "next/server";
import {
  CreatePartSchema,
  PartsInventoryQuerySchema,
  createPart,
  listParts,
  parseQuery,
} from "./_service";
import { actorIdFromRequest, jsonError, requirePartsInventoryAuth } from "./_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = parseQuery(PartsInventoryQuerySchema, searchParams);
    return NextResponse.json(await listParts(query));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const body = CreatePartSchema.parse(await request.json());
    return NextResponse.json(await createPart(body, actorIdFromRequest(request)), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
