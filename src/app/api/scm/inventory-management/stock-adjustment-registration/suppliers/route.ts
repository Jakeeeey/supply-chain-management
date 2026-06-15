import { NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/services/stock-adjustment-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment-registration/suppliers
 * Returns active suppliers (nonBuy = 0) for the supplier filter dropdown.
 */
export async function GET() {
  try {
    const data = await stockAdjustmentService.fetchSuppliers();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
