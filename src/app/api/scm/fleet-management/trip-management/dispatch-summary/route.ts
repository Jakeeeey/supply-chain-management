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

async function fetchDirectus<T = unknown>(path: string) {
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
      othersRes,
      purchasesRes,
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
      fetchDirectus(
        `/items/post_dispatch_plan_others?limit=${encodeURIComponent(limit)}&fields=id,post_dispatch_plan_id,remarks,distance,status`,
      ),
      fetchDirectus(
        `/items/post_dispatch_purchases?limit=${encodeURIComponent(limit)}&fields=id,post_dispatch_plan_id,po_id.purchase_order_id,po_id.purchase_order_no,status`,
      ),
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
      othersRes,
      purchasesRes,
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
    const rawPlans = (plansRes as { ok: true, json: { data: PostDispatchPlan[] } }).json?.data ?? [];
    const staff = (staffRes as { ok: true, json: { data: PostDispatchPlanStaff[] } }).json?.data ?? [];
    const dispatchInvoices = (invRes as { ok: true, json: { data: PostDispatchInvoice[] } }).json?.data ?? [];
    const salesInvoices = (salesInvRes as { ok: true, json: { data: SalesInvoice[] } }).json?.data ?? [];
    const vehicles = (vehiclesRes as { ok: true, json: { data: Vehicle[] } }).json?.data ?? [];
    const users = (usersRes as { ok: true, json: { data: User[] } }).json?.data ?? [];
    const customers = (customersRes as { ok: true, json: { data: Customer[] } }).json?.data ?? [];
    const salesmen = (salesmenRes as { ok: true, json: { data: Salesman[] } }).json?.data ?? [];
    const planOthers = (othersRes as { ok: true, json: { data: PostDispatchPlanOther[] } }).json?.data ?? [];
    const planPurchases = (purchasesRes as { ok: true, json: { data: PostDispatchPurchase[] } }).json?.data ?? [];

    if (!rawPlans.length) return NextResponse.json({ data: [] });

    // Build maps
    const userMap = new Map<string, string>(
      users.map((u) => [
        String(u.user_id),
        `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim(),
      ]),
    );

    const vehicleMap = new Map<string, string>(
      vehicles.map((v) => [
        String(v.vehicle_id),
        String(v.vehicle_plate ?? ""),
      ]),
    );

    const salesmanMap = new Map<string, string>(
      salesmen.map((s) => [String(s.id), String(s.salesman_name ?? "")]),
    );

    const salesInvoiceMap = new Map<string, SalesInvoice>(
      salesInvoices.map((si) => [String(si.invoice_id), si]),
    );

    const customerMap = new Map<string, Customer>();
    customers.forEach((c) => {
      if (c.customer_code)
        customerMap.set(normalizeCode(String(c.customer_code)), c);
    });

    // Group invoices by plan id
    const invoicesByPlan = new Map<string, PostDispatchInvoice[]>();
    dispatchInvoices.forEach((inv) => {
      if (!inv.post_dispatch_plan_id) return;
      const pId = String(inv.post_dispatch_plan_id);
      if (!invoicesByPlan.has(pId)) invoicesByPlan.set(pId, []);
      invoicesByPlan.get(pId)!.push(inv);
    });

    const othersByPlan = new Map<string, PostDispatchPlanOther[]>();
    planOthers.forEach((o) => {
      if (!o.post_dispatch_plan_id) return;
      const pId = String(o.post_dispatch_plan_id);
      if (!othersByPlan.has(pId)) othersByPlan.set(pId, []);
      othersByPlan.get(pId)!.push(o);
    });

    const purchasesByPlan = new Map<string, PostDispatchPurchase[]>();
    planPurchases.forEach((p) => {
      if (!p.post_dispatch_plan_id) return;
      const pId = String(p.post_dispatch_plan_id);
      if (!purchasesByPlan.has(pId)) purchasesByPlan.set(pId, []);
      purchasesByPlan.get(pId)!.push(p);
    });

    // Driver & Helpers per plan (from staff table)
    const driverByPlan = new Map<string, string>();
    const helpersByPlan = new Map<string, string[]>();
    staff.forEach((s) => {
      const pId = String(s.post_dispatch_plan_id);
      if (String(s.role).toLowerCase() === "driver") {
        driverByPlan.set(pId, String(s.user_id));
      } else if (String(s.role).toLowerCase() === "helper") {
        if (!helpersByPlan.has(pId)) helpersByPlan.set(pId, []);
        const name = userMap.get(String(s.user_id)) || "Unknown Helper";
        helpersByPlan.get(pId)!.push(name);
      }
    });

    // Assemble
    const mappedPlans = rawPlans.map((plan) => {
      const planIdStr = String(plan.id);

      const driverUserId =
        driverByPlan.get(planIdStr) || String(plan.driver_id ?? "");
      const driverName = userMap.get(driverUserId) || "Unknown Driver";

      const vehicleIdStr = plan.vehicle_id ? String(plan.vehicle_id) : "";
      const vehiclePlateNo = vehicleMap.get(vehicleIdStr) || "Unknown Plate";

      const planInvoices = invoicesByPlan.get(planIdStr) || [];
      const planOthersList = othersByPlan.get(planIdStr) || [];
      const planPurchasesList = purchasesByPlan.get(planIdStr) || [];

      // Salesman from first valid invoice with salesman_id
      let foundSalesmanName = "Unknown Salesman";
      let foundSalesmanId = "N/A";

      const representativeInvoice = planInvoices.find((inv) => {
        const si = salesInvoiceMap.get(String(inv.invoice_id));
        return si && si.salesman_id;
      });

      if (representativeInvoice) {
        const si = salesInvoiceMap.get(
          String(representativeInvoice.invoice_id),
        );
        if (si) {
          const sIdStr = String(si.salesman_id);
          foundSalesmanName = salesmanMap.get(sIdStr) || "Unknown Salesman";
          foundSalesmanId = sIdStr;
        }
      }

      const customerTransactions = planInvoices.map((inv) => {
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

      planOthersList.forEach((o) => {
        customerTransactions.push({
          id: `other-${o.id}`,
          customerName: String(o.remarks || "Manual Route Stop").trim(),
          address: `Distance: ${o.distance || 0} km`,
          itemsOrdered: "N/A",
          amount: 0,
          status: String(o.status ?? "Not Fulfilled"),
        });
      });

      planPurchasesList.forEach((p) => {
        const poNo = p.po_id?.purchase_order_no || p.po_id?.purchase_order_id || "";
        customerTransactions.push({
          id: `po-${p.id}`,
          customerName: `Purchase Order ${poNo}`.trim(),
          address: "PO Stop",
          itemsOrdered: "N/A",
          amount: 0,
          status: String(p.status ?? "Not Fulfilled"),
        });
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
        helpers: helpersByPlan.get(planIdStr) || [],
        status: String(plan.status ?? ""),
        createdAt: String(plan.date_encoded ?? ""),
        updatedAt: String(plan.date_encoded ?? ""),
      };
    });

    return NextResponse.json({ data: mappedPlans });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "Failed to load dispatch summary data",
        details: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}

interface PostDispatchPlan {
  id: number;
  doc_no: string;
  driver_id: number;
  vehicle_id: number;
  starting_point: number;
  time_of_dispatch: string | null;
  time_of_arrival: string | null;
  estimated_time_of_dispatch: string | null;
  estimated_time_of_arrival: string | null;
  status: string;
  date_encoded: string;
}

interface PostDispatchPlanStaff {
  post_dispatch_plan_id: number;
  user_id: number;
  role: string;
}

interface PostDispatchInvoice {
  id: number;
  post_dispatch_plan_id: number;
  invoice_id: number;
  status: string;
}

interface SalesInvoice {
  invoice_id: number;
  total_amount: number | string;
  customer_code: string;
  salesman_id: number;
}

interface Vehicle {
  vehicle_id: number;
  vehicle_plate: string;
}

interface User {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

interface Customer {
  customer_code: string;
  customer_name: string;
  city: string;
  province: string;
}

interface Salesman {
  id: number;
  salesman_name: string;
}

interface PostDispatchPlanOther {
  id: number;
  post_dispatch_plan_id: number;
  remarks: string;
  distance: number;
  status: string;
}

interface PostDispatchPurchase {
  id: number;
  post_dispatch_plan_id: number;
  po_id: {
    purchase_order_id: number;
    purchase_order_no: string;
  };
  status: string;
}
