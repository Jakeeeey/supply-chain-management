import { NextRequest, NextResponse } from "next/server";
import { updateTransferStatus } from "@/modules/supply-chain-management/warehouse-management/stock-transfer/services/stock-transfer.service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing required field: ids array" }, { status: 400 });
    }

    const { success } = await updateTransferStatus({ ids, status });

    return NextResponse.json({ 
      success, 
      count: ids.length 
    });
  } catch (error: unknown) {
    console.error("[Manual Dispatch API Error]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
