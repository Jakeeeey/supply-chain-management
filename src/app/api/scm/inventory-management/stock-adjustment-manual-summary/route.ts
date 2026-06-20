import { NextRequest, NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-summary/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-summary/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      search: searchParams.get("search") || undefined,
      branchId: searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
    };

    const data = await stockAdjustmentManualService.fetchAllHeaders(params);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
