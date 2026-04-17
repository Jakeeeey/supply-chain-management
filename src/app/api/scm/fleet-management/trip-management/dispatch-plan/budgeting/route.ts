import { handleApiError } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/utils/error-handler";
import * as budgetingService from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/budgeting/services/budgeting.service";
import { UpdateBudgetSchema } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/budgeting/types/budgeting.schema";
import { NextRequest, NextResponse } from "next/server";

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

    const result = await budgetingService.updateBudgets(
      Number(planId),
      parsed.data.budgets,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Budgeting PATCH Error]:", error);
    return handleApiError(error);
  }
}
