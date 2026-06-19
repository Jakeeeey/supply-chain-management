import { NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment-manual/next-doc-no
 * Returns the next available sequential document number.
 * Query params:
 *   - type: 'IN' | 'OUT'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "IN" | "OUT" || "IN";
    
    const doc_no = await stockAdjustmentManualService.fetchNextDocNo(type);
    return NextResponse.json({ doc_no });
  } catch (error) {
    return handleApiError(error);
  }
}
