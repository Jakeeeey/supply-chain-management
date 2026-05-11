import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const branchId = searchParams.get("branchId");
    
    const token = request.cookies.get("vos_access_token")?.value;

    if (!productId || !branchId) {
      return NextResponse.json({ error: "Missing productId or branchId" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    const rfidData = await stockAdjustmentManualService.checkRFIDStatus(Number(productId), Number(branchId), token);
    return NextResponse.json({ rfidData });
  } catch (error) {
    return handleApiError(error);
  }
}
