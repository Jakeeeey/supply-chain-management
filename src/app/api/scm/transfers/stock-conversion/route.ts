import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/modules/supply-chain-management/transfers/stock-conversion/utils/error-handler";
import { fetchStockList, convertStock, fetchInventoryMap } from "@/modules/supply-chain-management/transfers/stock-conversion/services/stock-conversion";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/transfers/stock-conversion/types/stock-conversion.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const allCookiesObj = req.cookies.getAll();
    const springToken = req.cookies.get('springboot_token')?.value || 
                       req.cookies.get('vos_access_token')?.value;
    
    console.log(`[Stock-Conversion API] All Cookies:`, allCookiesObj.map(c => `${c.name}=${c.value.substring(0, 5)}...`));
    console.log(`[Stock-Conversion API] GET Request URL: ${req.url}`);
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const branchId = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;
    
    // Filters for inventory
    const filters = {
      supplierShortcut: searchParams.get("supplierShortcut") || undefined,
      productCategory: searchParams.get("productCategory") || undefined,
      unitName: searchParams.get("unitName") || undefined,
      productBrand: searchParams.get("productBrand") || undefined,
      productIds: searchParams.get("productIds")?.split(",").map(Number).filter(n => !isNaN(n)),
    };

    // Staged loading support
    if (type === "inventory") {
        console.log(`[Stock-Conversion API] Background inventory fetch for branch ${branchId || 'ALL'}. Filters: ${JSON.stringify(filters)}. Token present: ${!!springToken}`);
        try {
            const data = await fetchInventoryMap(springToken, branchId, filters);
            console.log("[Stock-Conversion API] Background inventory fetch SUCCESS");
            return NextResponse.json({ data });
        } catch (e: unknown) {
            const err = e as Error;
            console.error("[Stock-Conversion API] Background inventory fetch FAILED:", err.message);
            throw err;
        }
    }

    console.log("[Stock-Conversion API] Initial product fetch requested");
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;
    const offset = (page - 1) * limit;

    const data = await fetchStockList(limit, offset, filters);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = stockConversionPayloadSchema.parse(body);
    const result = await convertStock(validated);
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
