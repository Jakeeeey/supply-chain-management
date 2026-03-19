import { NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const data = await stockAdjustmentService.fetchBranches();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
