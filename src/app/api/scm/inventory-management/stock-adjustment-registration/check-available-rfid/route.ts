import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/services/stock-adjustment-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get("rfid");
    const branchId = searchParams.get("branchId");
    const type = searchParams.get("type"); // "IN" or "OUT"
    const supplierId = searchParams.get("supplierId");
    const productId = searchParams.get("productId");

    const token = request.cookies.get("vos_access_token")?.value;

    if (!rfid) {
      return NextResponse.json({ error: "Missing rfid" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    // ── Stock OUT: validate that the RFID belongs to this branch, supplier, and product ──
    if (type === "OUT") {
      if (!branchId || !supplierId || !productId) {
        return NextResponse.json(
          { error: "Missing branchId, supplierId, or productId for Stock OUT validation" },
          { status: 400 }
        );
      }

      const result = await stockAdjustmentService.validateRFIDForStockOut(
        rfid,
        Number(branchId),
        Number(supplierId),
        Number(productId),
        token
      );

      // Return shape: { exists: false } means valid (tag NOT blocked) for Stock OUT
      // We invert: valid=true → exists=false (not blocked), valid=false → exists=true (blocked)
      return NextResponse.json({
        exists: !result.valid,
        location: result.reason,
      });
    }

    // ── Stock IN: original duplicate-check logic ──────────────────────────
    const { exists, location } = await stockAdjustmentService.checkRFIDExists(
      rfid,
      token,
      branchId ? Number(branchId) : undefined
    );

    return NextResponse.json({ exists, location });
  } catch (error) {
    return handleApiError(error);
  }
}
