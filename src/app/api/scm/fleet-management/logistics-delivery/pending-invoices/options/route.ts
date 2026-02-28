import { NextResponse } from "next/server";
import { directusGet, type DirectusListResponse } from "../_directus";

type SalesmanRow = { id: number; salesman_name?: string | null };
type CustomerRow = { customer_code: string; customer_name?: string | null };

export async function GET() {
  const [salesmenRes, customersRes] = await Promise.all([
    directusGet<DirectusListResponse<SalesmanRow>>("/salesman", {
      fields: "id,salesman_name",
      sort: "salesman_name",
      limit: "-1",
    }),
    directusGet<DirectusListResponse<CustomerRow>>("/customer", {
      fields: "customer_code,customer_name",
      sort: "customer_name",
      limit: "-1",
    }),
  ]);

  if (salesmenRes instanceof NextResponse) return salesmenRes;
  if (customersRes instanceof NextResponse) return customersRes;

  return NextResponse.json({
    salesmen: (salesmenRes.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.id} - ${s.salesman_name ?? ""}`.trim(),
    })),
    customers: (customersRes.data ?? []).map((c) => ({
      code: c.customer_code,
      label: `${c.customer_name ?? c.customer_code}`.trim(),
    })),
    statuses: ["All", "Unlinked", "For Dispatch", "Inbound", "Cleared"],
  });
}
