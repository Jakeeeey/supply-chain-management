import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/utils/error-handler";

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

    const products = await stockAdjustmentManualService.fetchBranchRFIDStatus(Number(branchId), token);
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}
