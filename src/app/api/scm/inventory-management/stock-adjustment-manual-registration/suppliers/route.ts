import { NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment-manual/suppliers
 * Returns active suppliers (nonBuy = 0) for the supplier filter dropdown.
 */
export async function GET() {
  try {
    const data = await stockAdjustmentManualService.fetchSuppliers();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
