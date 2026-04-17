
import { NextResponse } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/services/stock-adjustment-service";

export async function GET() {
  try {
    const data = await stockAdjustmentService.fetchUnits();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
