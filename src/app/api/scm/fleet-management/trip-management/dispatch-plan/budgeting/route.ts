import { handleApiError } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/utils/error-handler";
import * as budgetingService from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/budgeting/services/budgeting.service";
import { UpdateBudgetSchema } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/budgeting/types/budgeting.schema";
import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("plan_id");

    if (!planId) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 },
      );
    }

    const fuelAllocation = await budgetingService.getFuelAllocation(Number(planId));
    return NextResponse.json({ data: { fuel_allocation: fuelAllocation } });
  } catch (error) {
    console.error("[Budgeting GET Error]:", error);
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("plan_id");
    const body = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "plan_id is required" },
        { status: 400 },
      );
    }

    const parsed = UpdateBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Budget validation failed",
        },
        { status: 400 },
      );
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const payload = decodeJwtPayload(token || "");
    const userId = Number(payload?.user_id || payload?.id || payload?.sub || 0);

    const result = await budgetingService.updateBudgets(
      Number(planId),
      parsed.data.budgets,
      parsed.data.fuel_liter,
      userId || undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Budgeting PATCH Error]:", error);
    return handleApiError(error);
  }
}

