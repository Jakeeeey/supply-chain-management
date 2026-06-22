import { NextRequest, NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/utils/error-handler";
import { getUserIdFromToken } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/utils/auth-utils";

/**
 * POST /api/scm/inventory-management/stock-adjustment-manual/[id]/post
 * Finalizes a stock adjustment.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Extract userId from cookie
        const token = request.cookies.get("vos_access_token")?.value;
        const userId = getUserIdFromToken(token);

        console.log(`[API] Posting stock adjustment ID: ${id} with userId: ${userId}`);
        
        const data = await stockAdjustmentManualService.postStockAdjustment(Number(id), userId || undefined);
        return NextResponse.json({ data });
    } catch (error) {
        return handleApiError(error);
    }
}
