import { dispatchPlanService } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/services/dispatch-plan";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/scm/warehouse-management/consolidation/pre-dispatch-plan/[id]
 * Fetches a single dispatch plan with its full details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await dispatchPlanService.fetchPlanById(id);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("[PDP API GET by ID Error]:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dispatch plan" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/scm/warehouse-management/consolidation/pre-dispatch-plan/[id]
 * Updates plan status (approve action)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === "approve") {
      await dispatchPlanService.approvePlan(id);
      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[PDP API PATCH Error]:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to update dispatch plan" },
      { status: 500 },
    );
  }
}
