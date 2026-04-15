import { NextResponse } from "next/server";
import { type PendingStatus, fetchItemizedReplica } from "../logic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "All";
  const salesmanId = url.searchParams.get("salesmanId") ?? "All";
  const customerCode = url.searchParams.get("customerCode") ?? "All";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";

  try {
    const rows = await fetchItemizedReplica({
      q,
      status: status as PendingStatus | "All",
      salesmanId,
      customerCode,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("Pending Deliveries API Error:", err);
    return NextResponse.json({ error: "Failed to load pending deliveries" }, { status: 500 });
  }
}
