import { NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment/next-doc-no
 * Returns the next available sequential document number.
 * Query params:
 *   - type: 'IN' | 'OUT'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "IN" | "OUT" || "IN";
    
    const doc_no = await stockAdjustmentService.fetchNextDocNo(type);
    return NextResponse.json({ doc_no });
  } catch (error) {
    return handleApiError(error);
  }
}
