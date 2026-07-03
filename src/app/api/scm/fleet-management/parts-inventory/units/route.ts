import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSharedUnit } from "../_service";
import { jsonError, requirePartsInventoryAuth } from "../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSharedUnitSchema = z.object({
  unitName: z.string().trim().min(1, "Unit name is required"),
  unitShortcut: z.string().trim().min(1, "Unit shortcut is required"),
  skuCode: z.string().trim().optional().nullable(),
  order: z.coerce.number().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const body = CreateSharedUnitSchema.parse(await request.json());
    const result = await createSharedUnit(body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
