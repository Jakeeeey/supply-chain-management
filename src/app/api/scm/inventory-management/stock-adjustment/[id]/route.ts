import { NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await stockAdjustmentService.fetchById(Number(id));
        return NextResponse.json({ data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const data = await stockAdjustmentService.update(Number(id), body);
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
        await stockAdjustmentService.deleteStockAdjustment(Number(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
