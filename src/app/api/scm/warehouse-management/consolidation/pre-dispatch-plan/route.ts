import { dispatchPlanService } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/services/dispatch-plan";
import { dispatchPlanFormSchema } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/scm/warehouse-management/consolidation/pre-dispatch-plan
 * Handles multiple query types: plans list, master data, available orders
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Master data for dropdowns
    if (type === "master") {
      const data = await dispatchPlanService.fetchMasterData();
      return NextResponse.json({ data });
    }

    // Available orders for dispatch planning
    if (type === "available_orders") {
      const clusterId = searchParams.get("cluster_id");
      const search = searchParams.get("search") || "";
      const data = await dispatchPlanService.fetchAvailableOrders(
        clusterId ? Number(clusterId) : undefined,
        search || undefined,
      );
      return NextResponse.json({ data });
    }

    // Default: paginated dispatch plans list
    const limit = Number(searchParams.get("limit") || 10);
    const offset = Number(searchParams.get("offset") || 0);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await dispatchPlanService.fetchPlans(
      limit,
      offset,
      status,
      search,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[PDP API GET Error]:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dispatch plans" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/scm/warehouse-management/consolidation/pre-dispatch-plan
 * Creates a new dispatch plan with validated form data
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate with Zod
    const parsed = dispatchPlanFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 },
      );
    }

    const data = await dispatchPlanService.createPlan(parsed.data);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[PDP API POST Error]:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to create dispatch plan" },
      { status: 500 },
    );
  }
}
