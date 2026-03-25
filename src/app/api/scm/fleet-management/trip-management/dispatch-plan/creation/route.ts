// ─── Dispatch Creation — API Route Handler ──────────────────
// Thin handlers only: parse request → validate → call service → respond.
// Zero fetch() calls — all I/O is delegated to the service layer.

import { handleApiError } from "@/lib/error-handler";
import * as dispatchService from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/services/dispatch.service";
import {
  DispatchCreationFormSchema,
  UpdateTripSchema,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";
import { NextRequest, NextResponse } from "next/server";

// ─── GET ────────────────────────────────────────────────────

/**
 * Dispatches GET requests to the appropriate service method based on the `type` query param.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "master") {
      const data = await dispatchService.getMasterData();
      return NextResponse.json({ data });
    }

    if (type === "approved_plans") {
      const branchId = searchParams.get("branch_id");
      const currentPlanId = searchParams.get("current_plan_id");
      const result = await dispatchService.getApprovedPlans(
        branchId ? Number(branchId) : undefined,
        currentPlanId ? Number(currentPlanId) : undefined,
      );
      return NextResponse.json(result);
    }

    if (type === "plan_details") {
      const planIdsRaw = searchParams.get("plan_ids");
      const tripId = searchParams.get("trip_id");
      if (!planIdsRaw) {
        return NextResponse.json(
          { error: "plan_ids is required" },
          { status: 400 },
        );
      }
      
      const planIds = planIdsRaw.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id));
      const result = await dispatchService.getPlanDetails(
        planIds,
        tripId ? Number(tripId) : undefined,
      );
      return NextResponse.json(result);
    }

    if (type === "budget_summary") {
      const data = await dispatchService.getBudgetSummary();
      return NextResponse.json({ data });
    }

    if (type === "plan_budgets") {
      const planId = searchParams.get("plan_id");
      if (!planId) {
        return NextResponse.json(
          { error: "plan_id is required" },
          { status: 400 },
        );
      }
      const data = await dispatchService.getPlanBudgets(Number(planId));
      return NextResponse.json({ data });
    }

    if (type === "post_plan_details") {
      const planId = searchParams.get("plan_id");
      if (!planId) {
        return NextResponse.json(
          { error: "plan_id is required" },
          { status: 400 },
        );
      }
      const data = await dispatchService.getPostPlanDetails(Number(planId));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("[Dispatch GET Error]:", error);
    return handleApiError(error);
  }
}

// ─── POST ───────────────────────────────────────────────────

/**
 * Creates a new dispatch plan after Zod validation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = DispatchCreationFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 },
      );
    }

    const result = await dispatchService.createDispatchPlan(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Dispatch POST Error]:", error);
    return handleApiError(error);
  }
}

// ─── PATCH ──────────────────────────────────────────────────

/**
 * Updates an existing dispatch plan.
 * - `?action=update_trip` → full trip update (validated with UpdateTripSchema)
 * - default → budget-only update (validated with UpdateBudgetSchema)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("plan_id");
    const action = searchParams.get("action");
    const body = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 },
      );
    }

    if (action === "update_trip") {
      const parsed = UpdateTripSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message || "Trip validation failed",
          },
          { status: 400 },
        );
      }

      const result = await dispatchService.updateTrip(
        Number(planId),
        parsed.data,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use '?action=update_trip'." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Dispatch PATCH Error]:", error);
    return handleApiError(error);
  }
}
