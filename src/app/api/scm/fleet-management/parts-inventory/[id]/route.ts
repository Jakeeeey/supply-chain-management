import { NextRequest, NextResponse } from "next/server";
import { UpdatePartSchema, getPartDetail, updatePart } from "../_service";
import { actorIdFromRequest, jsonError, requirePartsInventoryAuth } from "../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const { id } = await context.params;
    return NextResponse.json(await getPartDetail(Number(id)));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const { id } = await context.params;
    const body = UpdatePartSchema.parse(await request.json());
    return NextResponse.json(await updatePart(Number(id), body, actorIdFromRequest(request)));
  } catch (error) {
    return jsonError(error);
  }
}
