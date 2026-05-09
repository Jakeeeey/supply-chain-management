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
    if (isNaN(Number(id))) {
      return NextResponse.json({ data: null }, { status: 404 });
    }
    const result = await dispatchPlanService.fetchPlanById(id);
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch dispatch plan";
    console.error("[PDP API GET by ID Error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * PUT /api/scm/warehouse-management/consolidation/pre-dispatch-plan/[id]
 * Updates an existing dispatch plan and its detail records
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const body = await req.json();
    await dispatchPlanService.updatePlan(id, body);
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to update dispatch plan";
    console.error("[PDP API PUT Error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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
    if (isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const body = await req.json();
    const { action } = body;

    if (action === "approve") {
      await dispatchPlanService.approvePlan(id);
      return NextResponse.json({ data: { success: true } });
    }

    if (action === "reject") {
      await dispatchPlanService.rejectPlan(id, body.reject_remarks || "");
      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to update dispatch plan";
    console.error("[PDP API PATCH Error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
