import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/utils/error-handler";

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

    const products = await stockAdjustmentService.fetchBranchRFIDStatus(Number(branchId), token);
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}
