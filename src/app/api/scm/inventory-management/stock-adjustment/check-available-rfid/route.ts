import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get("rfid");
    const branchId = searchParams.get("branchId");
    
    const token = request.cookies.get("vos_access_token")?.value;

    if (!rfid || !branchId) {
      return NextResponse.json({ error: "Missing rfid or branchId" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    const exists = await stockAdjustmentService.checkRFIDExists(rfid, Number(branchId), token);
    return NextResponse.json({ exists });
  } catch (error) {
    return handleApiError(error);
  }
}
