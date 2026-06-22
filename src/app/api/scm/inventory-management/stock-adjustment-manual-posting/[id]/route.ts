import { NextRequest, NextResponse } from "next/server";
import { stockAdjustmentManualService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/services/stock-adjustment-manual-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/utils/error-handler";
import { getUserIdFromToken } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/utils/auth-utils";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await stockAdjustmentManualService.fetchById(Number(id));
        return NextResponse.json({ data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Extract userId from cookie
        const token = request.cookies.get("vos_access_token")?.value;
        const userId = getUserIdFromToken(token);

        const data = await stockAdjustmentManualService.update(Number(id), { ...body, userId: userId || undefined });
        return NextResponse.json({ data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await stockAdjustmentManualService.deleteStockAdjustment(Number(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
