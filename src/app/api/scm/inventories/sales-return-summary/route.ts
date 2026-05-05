import { NextRequest, NextResponse } from "next/server";
import { SalesReturnSummaryService } from "@/modules/supply-chain-management/inventories/sales-return-summary/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "customers") {
      const data = await SalesReturnSummaryService.getCustomersList();
      return json({ data });
    }

    if (action === "salesmen") {
      const data = await SalesReturnSummaryService.getSalesmenList();
      return json({ data });
    }

    if (action === "suppliers") {
      const data = await SalesReturnSummaryService.getSuppliersList();
      return json({ data });
    }

    if (action === "returnTypes") {
      const data = await SalesReturnSummaryService.getSalesReturnTypesList();
      return json({ data });
    }

    if (action === "report") {
      const page = Number(url.searchParams.get("page") || 1);
      const limit = Number(url.searchParams.get("limit") || 10);
      const search = url.searchParams.get("search") || "";
      
      const filters = {
        dateFrom: url.searchParams.get("dateFrom") || undefined,
        dateTo: url.searchParams.get("dateTo") || undefined,
        status: url.searchParams.get("status") || "All",
        customerCode: url.searchParams.get("customerCode") || "All",
        salesmanId: url.searchParams.get("salesmanId") || "All",
        supplierName: url.searchParams.get("supplierName") || "All",
        returnCategory: url.searchParams.get("returnCategory") || "All",
      };

      const result = await SalesReturnSummaryService.getSummaryReturnsWithItems(page, limit, search, filters);
      return json(result);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: any) {
    console.error("Sales Return Summary API GET Error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
}
