import { NextRequest, NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";
import { getUserIdFromToken } from "@/lib/auth-utils";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Extract userId from cookie
        const token = request.cookies.get("vos_access_token")?.value;
        const userId = getUserIdFromToken(token);
        
        console.log(`[API] Posting adjustment ${id} with userId: ${userId}`);
        await stockAdjustmentService.postStockAdjustment(Number(id), userId || undefined);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
