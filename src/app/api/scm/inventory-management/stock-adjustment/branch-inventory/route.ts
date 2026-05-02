import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment/branch-inventory?branchId=190
 *
 * Returns the full running-inventory map for a branch so the form can
 * look up any product's current stock instantly without a per-product
 * API call.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json({ error: "Missing branchId" }, { status: 400 });
    }

    const token = request.cookies.get("vos_access_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    const inventory = await stockAdjustmentService.fetchBranchInventory(Number(branchId), token);
    return NextResponse.json({ inventory });
  } catch (error) {
    return handleApiError(error);
  }
}
