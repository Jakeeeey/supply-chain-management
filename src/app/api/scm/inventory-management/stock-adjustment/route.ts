import { NextRequest, NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";
import { handleApiError } from "@/lib/error-handler";
import { getUserIdFromToken } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      search: searchParams.get("search") || undefined,
      branchId: searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
    };

    const data = await stockAdjustmentService.fetchAllHeaders(params);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract userId from cookie
    const token = request.cookies.get("vos_access_token")?.value;
    const userId = getUserIdFromToken(token);
    
    console.log(`[API] Creating stock adjustment with userId: ${userId}`);
    const data = await stockAdjustmentService.create({ ...body, userId: userId || undefined });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
