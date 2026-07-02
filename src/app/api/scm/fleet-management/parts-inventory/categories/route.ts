import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCategory } from "../_service";
import { actorIdFromRequest, jsonError, requirePartsInventoryAuth } from "../_route-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const authError = requirePartsInventoryAuth(request);
    if (authError) return authError;

    const body = CreateCategorySchema.parse(await request.json());
    const result = await createCategory(body.name, actorIdFromRequest(request));
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
