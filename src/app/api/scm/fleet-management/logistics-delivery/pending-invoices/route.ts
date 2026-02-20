import { NextRequest, NextResponse } from "next/server";
import { listPendingInvoices } from "./logic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      q: searchParams.get("q") || undefined,
      status: searchParams.get("status") || undefined,
      salesmanId: searchParams.get("salesmanId") || undefined,
      customerCode: searchParams.get("customerCode") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 25,
    };

    const data = await listPendingInvoices(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
