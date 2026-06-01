import { handleApiError } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/error-handler";
import { dispatchPlanService } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/services/dispatch-plan";
import { dispatchPlanFormSchema } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

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
      const branchId = searchParams.get("branch_id");
      const search = searchParams.get("search") || "";
      const data = await dispatchPlanService.fetchAvailableOrders(
        clusterId ? Number(clusterId) : undefined,
        search || undefined,
        branchId ? Number(branchId) : undefined,
      );
      return NextResponse.json({ data });
    }

    // Dashboard metrics
    if (type === "metrics") {
      const clusterId = searchParams.get("cluster_id");
      const branchId = searchParams.get("branch_id");
      const status = searchParams.get("status");
      const search = searchParams.get("search");
      const startDate = searchParams.get("start_date");
      const endDate = searchParams.get("end_date");

      const data = await dispatchPlanService.fetchMetrics(
        clusterId ? Number(clusterId) : undefined,
        branchId ? Number(branchId) : undefined,
        status || undefined,
        search || undefined,
        startDate || undefined,
        endDate || undefined,
      );
      return NextResponse.json({ data });
    }

    // Default: paginated dispatch plans list
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "-1" ? -1 : Number(limitParam || 10);
    const offset = Number(searchParams.get("offset") || 0);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const clusterId = searchParams.get("cluster_id") || undefined;
    const branchId = searchParams.get("branch_id") || undefined;
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;

    const result = await dispatchPlanService.fetchPlans(
      limit,
      offset,
      status,
      search,
      clusterId ? Number(clusterId) : undefined,
      branchId ? Number(branchId) : undefined,
      startDate,
      endDate,
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
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

    // Extract userId from token
    const token = req.cookies.get("vos_access_token")?.value || req.cookies.get("springboot_token")?.value || req.cookies.get("directus_session_token")?.value;
    const decoded: Record<string, unknown> | null = token ? jwtDecode<Record<string, unknown>>(token) : null;
    const rawId = decoded?.sub ?? decoded?.id ?? decoded?.user_id ?? decoded?.userId;
    const userId = rawId ? Number(rawId) : undefined;

    const data = await dispatchPlanService.createPlan(parsed.data, userId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
