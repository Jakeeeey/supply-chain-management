import { NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment-manual/products
 *
 * Query params:
 *   - search   (optional) — filter by product name/code/barcode
 *   - supplierId (optional) — when provided, only products linked to this supplier
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const supplierId = searchParams.get("supplierId");

    let data;
    if (supplierId) {
      // Supplier-filtered product fetch
      data = await stockAdjustmentManualService.fetchProductsBySupplier(
        Number(supplierId),
        search
      );
    } else {
      // Fallback: fetch all products (legacy)
      data = await stockAdjustmentManualService.fetchProducts({ search });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
