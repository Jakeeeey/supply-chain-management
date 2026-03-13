import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/error-handler";
import { fetchStockList, convertStock, fetchInventoryMap } from "@/modules/supply-chain-management/inventory-management/stock-conversion/services/stock-conversion";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/inventory-management/stock-conversion/types/stock-conversion.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const springToken = req.cookies.get('springboot_token')?.value || 
                       req.cookies.get('vos_access_token')?.value;
    
    console.log(`[Stock-Conversion API] GET Request URL: ${req.url}`);
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const branchId = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;

    // Staged loading support
    if (type === "inventory") {
        console.log(`[Stock-Conversion API] Background inventory fetch for branch ${branchId || 'ALL'}. Token present: ${!!springToken}`);
        try {
            const data = await fetchInventoryMap(springToken, branchId);
            console.log("[Stock-Conversion API] Background inventory fetch SUCCESS");
            return NextResponse.json({ data });
        } catch (err: any) {
            console.error("[Stock-Conversion API] Background inventory fetch FAILED:", err.message);
            throw err;
        }
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
