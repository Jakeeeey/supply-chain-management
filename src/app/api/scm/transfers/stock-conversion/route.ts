import { NextRequest, NextResponse } from "next/server";
import { stockConversionService, stockConversionRepo } from "@/modules/supply-chain-management/transfers/stock-conversion/services";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/transfers/stock-conversion/types";
import { AppError } from "@/modules/supply-chain-management/transfers/stock-conversion/utils/error-handler";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const springToken = req.cookies.get('springboot_token')?.value || req.cookies.get('vos_access_token')?.value;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const branchId = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;
    
    // 1. Inventory Fetch
    if (type === "inventory") {
        const queryParams = searchParams.toString().replace(/type=inventory&?/, "").replace(/branchId=\d+&?/, "");
        const data = await stockConversionRepo.fetchInventory(springToken, branchId, queryParams || undefined);
        return NextResponse.json({ data }, {
          headers: { "Cache-Control": "no-store, max-age=0" }
        });
    }

    // 2. Product List Fetch
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const hasStock = searchParams.get("hasStock") === "true";
    const offset = (page - 1) * limit;

    // Filter building
    const filters: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (!["page", "limit", "branchId", "hasStock", "type"].includes(key)) {
        filters[key] = val;
      }
    });

    const data = await stockConversionService.getStockList(limit, offset, branchId, hasStock, filters, springToken);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error: unknown) {
    console.error("[API Error] Stock Conversion Route:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate payload with Zod schema before processing
    const parsed = stockConversionPayloadSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: `Validation failed: ${firstError?.path.join(".") || "unknown"} — ${firstError?.message || "invalid"}` },
        { status: 400 }
      );
    }

    const data = await stockConversionService.executeConversion(parsed.data);
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
