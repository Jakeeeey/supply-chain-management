import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

async function fetchDirectus<T = any>(path: string) {
  const url = `${DIRECTUS_BASE}${path}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: directusHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false as const, status: res.status, body };
  }
  const json = (await res.json()) as T;
  return { ok: true as const, json };
}

function normalizeCode(code: string) {
  return code ? code.replace(/\s+/g, "") : "";
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not set" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "-1";

    // NOTE: No cache as requested.

    // Fetch in parallel (no caching)
    const [
      plansRes,
      staffRes,
      invRes,
      salesInvRes,
      vehiclesRes,
      usersRes,
      customersRes,
      salesmenRes,
    ] = await Promise.all([
      fetchDirectus(
        `/items/post_dispatch_plan?limit=${encodeURIComponent(limit)}&fields=id,doc_no,driver_id,vehicle_id,starting_point,time_of_dispatch,time_of_arrival,estimated_time_of_dispatch,estimated_time_of_arrival,status,date_encoded&sort=-date_encoded`,
      ),
      fetchDirectus(
        `/items/post_dispatch_plan_staff?limit=${encodeURIComponent(limit)}&fields=post_dispatch_plan_id,user_id,role`,
      ),
      fetchDirectus(
        `/items/post_dispatch_invoices?limit=${encodeURIComponent(limit)}&fields=id,post_dispatch_plan_id,invoice_id,status`,
      ),

      // IMPORTANT: avoid forbidden "id" field on sales_invoice (use invoice_id)
      fetchDirectus(
        `/items/sales_invoice?limit=-1&fields=invoice_id,total_amount,customer_code,salesman_id`,
      ),

      fetchDirectus(`/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate`),
      fetchDirectus(
        `/items/user?limit=-1&fields=user_id,user_fname,user_lname`,
      ),
      fetchDirectus(
        `/items/customer?limit=-1&fields=customer_code,customer_name,city,province`,
      ),
      fetchDirectus(`/items/salesman?limit=-1&fields=id,salesman_name`),
    ]);

    // Handle upstream failures
    const all = [
      plansRes,
      staffRes,
      invRes,
      salesInvRes,
      vehiclesRes,
      usersRes,
      customersRes,
      salesmenRes,
    ];
    const failed = all.find((x) => !x.ok);
    if (failed && !failed.ok) {
      return NextResponse.json(
        {
          error: "Upstream request failed",
          details: failed.body,
          upstream_status: failed.status,
        },
        { status: 500 },
      );
    }

    // Extract data
    const rawPlans = (plansRes as any).json?.data ?? [];
    const staff = (staffRes as any).json?.data ?? [];
    const dispatchInvoices = (invRes as any).json?.data ?? [];
    const salesInvoices = (salesInvRes as any).json?.data ?? [];
    const vehicles = (vehiclesRes as any).json?.data ?? [];
    const users = (usersRes as any).json?.data ?? [];
    const customers = (customersRes as any).json?.data ?? [];
    const salesmen = (salesmenRes as any).json?.data ?? [];

    if (!rawPlans.length) return NextResponse.json({ data: [] });

    // Build maps
    const userMap = new Map<string, string>(
      users.map((u: any) => [
        String(u.user_id),
        `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim(),
      ]),
    );

    const vehicleMap = new Map<string, string>(
      vehicles.map((v: any) => [
        String(v.vehicle_id),
        String(v.vehicle_plate ?? ""),
      ]),
    );

    const salesmanMap = new Map<string, string>(
      salesmen.map((s: any) => [String(s.id), String(s.salesman_name ?? "")]),
    );

    const salesInvoiceMap = new Map<string, any>(
      salesInvoices.map((si: any) => [String(si.invoice_id), si]),
    );

    const customerMap = new Map<string, any>();
    customers.forEach((c: any) => {
      if (c.customer_code)
        customerMap.set(normalizeCode(String(c.customer_code)), c);
    });

    // Group invoices by plan id
    const invoicesByPlan = new Map<string, any[]>();
    dispatchInvoices.forEach((inv: any) => {
      if (!inv.post_dispatch_plan_id) return;
      const pId = String(inv.post_dispatch_plan_id);
      if (!invoicesByPlan.has(pId)) invoicesByPlan.set(pId, []);
      invoicesByPlan.get(pId)!.push(inv);
    });

    // Driver per plan (from staff table)
    const driverByPlan = new Map<string, string>();
    staff.forEach((s: any) => {
      if (String(s.role).toLowerCase() === "driver") {
        driverByPlan.set(String(s.post_dispatch_plan_id), String(s.user_id));
      }
    });

    // Assemble
    const mappedPlans = rawPlans.map((plan: any) => {
      const planIdStr = String(plan.id);

      const driverUserId =
        driverByPlan.get(planIdStr) || String(plan.driver_id ?? "");
      const driverName = userMap.get(driverUserId) || "Unknown Driver";

      const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : "";
      const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || "Unknown Plate";

      const planInvoices = invoicesByPlan.get(planIdStr) || [];

      // Salesman from first valid invoice with salesman_id
      let foundSalesmanName = "Unknown Salesman";
      let foundSalesmanId = "N/A";

      const representativeInvoice = planInvoices.find((inv: any) => {
        const si = salesInvoiceMap.get(String(inv.invoice_id));
        return si && si.salesman_id;
      });

      if (representativeInvoice) {
        const si = salesInvoiceMap.get(
          String(representativeInvoice.invoice_id),
        );
        const sIdStr = String(si.salesman_id);
        foundSalesmanName = salesmanMap.get(sIdStr) || "Unknown Salesman";
        foundSalesmanId = sIdStr;
      }

      const customerTransactions = planInvoices.map((inv: any) => {
        const si = salesInvoiceMap.get(String(inv.invoice_id));
        let customerName = "Unknown Customer";
        let address = "N/A";
        let amount = 0;

        if (si) {
          amount = Number(si.total_amount || 0) || 0;
          if (si.customer_code) {
            const cObj = customerMap.get(
              normalizeCode(String(si.customer_code)),
            );
            if (cObj) {
              customerName = String(cObj.customer_name ?? customerName);
              address =
                `${cObj.city || ""}${cObj.city ? ", " : ""}${cObj.province || ""}`.trim() ||
                "N/A";
            }
          }
        }

        return {
          id: String(inv.id),
          customerName,
          address,
          itemsOrdered: "N/A",
          amount,
          status: String(inv.status ?? ""),
        };
      });

      return {
        id: planIdStr,
        dpNumber: String(plan.doc_no ?? ""),
        driverId: driverUserId,
        driverName,
        salesmanId: foundSalesmanId,
        salesmanName: foundSalesmanName,
        vehicleId: vehicleIdStr,
        vehiclePlateNo,
        startingPoint: String(plan.starting_point ?? ""),
        timeOfDispatch: plan.time_of_dispatch ?? null,
        timeOfArrival: plan.time_of_arrival ?? null,
        estimatedDispatch: String(plan.estimated_time_of_dispatch ?? ""),
        estimatedArrival: String(plan.estimated_time_of_arrival ?? ""),
        customerTransactions,
        status: String(plan.status ?? ""),
        createdAt: String(plan.date_encoded ?? ""),
        updatedAt: String(plan.date_encoded ?? ""),
      };
    });

    return NextResponse.json({ data: mappedPlans });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to load dispatch summary data",
        details: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}
