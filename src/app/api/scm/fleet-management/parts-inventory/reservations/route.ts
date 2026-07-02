import { NextRequest, NextResponse } from "next/server";
import {
  CreateReservationSchema,
  ReservationQuerySchema,
  UpdateReservationSchema,
  createReservation,
  listReservations,
  parseQuery,
  updateReservation,
} from "../_service";
import { actorIdFromRequest, jsonError, requirePartsInventoryAuth } from "../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = parseQuery(ReservationQuerySchema, searchParams);
    return NextResponse.json(await listReservations(query));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const body = CreateReservationSchema.parse(await request.json());
    return NextResponse.json(await createReservation(body, actorIdFromRequest(request)), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const body = UpdateReservationSchema.parse(await request.json());
    return NextResponse.json(await updateReservation(body, actorIdFromRequest(request)));
  } catch (error) {
    return jsonError(error);
  }
}
