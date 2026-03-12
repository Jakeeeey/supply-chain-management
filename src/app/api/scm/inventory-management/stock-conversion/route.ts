import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/error-handler";
import { fetchStockList, convertStock, fetchInventoryMap } from "@/modules/supply-chain-management/inventory-management/stock-conversion/services/stock-conversion";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/inventory-management/stock-conversion/types/stock-conversion.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const springToken = req.cookies.get('springboot_token')?.value || 
                       req.cookies.get('vos_access_token')?.value;
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Staged loading support
    if (type === "inventory") {
        console.log("[Stock-Conversion API] Background inventory fetch requested");
        const data = await fetchInventoryMap(springToken);
        return NextResponse.json({ data });
    }

    console.log("[Stock-Conversion API] Initial product fetch requested");
    const data = await fetchStockList();
    return NextResponse.json({ data });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = stockConversionPayloadSchema.parse(body);
    const result = await convertStock(validated);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return handleApiError(error);
  }
}
