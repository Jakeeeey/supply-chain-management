import { NextRequest, NextResponse } from "next/server";
import { manualReceiveItems } from "@/modules/supply-chain-management/warehouse-management/stock-transfer/services/stock-transfer.service";
import { decodeJwtPayload } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing required field: ids array" }, { status: 400 });
    }

    // Extract userId from token
    const token = request.cookies.get("vos_access_token")?.value;
    const decoded = token ? decodeJwtPayload(token) : null;
    const userId = decoded?.sub ? Number(decoded.sub) : undefined;

    const { success } = await manualReceiveItems(ids, status, userId);

    return NextResponse.json({ 
      success, 
      count: ids.length 
    });
  } catch (error: unknown) {
    console.error("[Manual Receive API Error]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
