import { fetchForArrivalSummaryData } from "./for-arrival-summary.repo";
import { normalizeCode } from "./for-arrival-summary.helpers";
import type {
  ForArrivalInvoice,
  SalesInvoiceRow,
  CustomerRow,
  PostDispatchInvoiceRow,
} from "../types/for-arrival-summary.types";

export async function getEnrichedForArrivalSummary(): Promise<ForArrivalInvoice[]> {
  const {
    rawPlans,
    staff,
    dispatchInvoices,
    salesInvoices,
    customers,
    users,
    vehicles,
  } = await fetchForArrivalSummaryData();

  if (!rawPlans.length) return [];

  // Build lookup maps
  const userMap = new Map<string, { fname: string; lname: string }>(
    users.map((u) => [
      String(u.user_id),
      { fname: u.user_fname ?? "", lname: u.user_lname ?? "" },
    ]),
  );

  const vehicleMap = new Map<string, string>(
    vehicles.map((v) => [String(v.vehicle_id), String(v.vehicle_plate ?? "")]),
  );

  const salesInvoiceMap = new Map<string, SalesInvoiceRow>(
    salesInvoices.map((si) => [String(si.invoice_id), si]),
  );

  const customerMap = new Map<string, CustomerRow>();
  customers.forEach((c) => {
    if (c.customer_code) {
      customerMap.set(normalizeCode(String(c.customer_code)), c);
    }
  });

  // Group invoices by plan id
  const invoicesByPlan = new Map<string, PostDispatchInvoiceRow[]>();
  dispatchInvoices.forEach((inv) => {
    if (!inv.post_dispatch_plan_id) return;
    const pId = String(inv.post_dispatch_plan_id);
    if (!invoicesByPlan.has(pId)) invoicesByPlan.set(pId, []);
    invoicesByPlan.get(pId)!.push(inv);
  });

  // Resolve driver and helpers per plan from staff table
  const driverByPlan = new Map<string, string>();
  const helpersByPlan = new Map<string, string[]>();

  staff.forEach((s) => {
    const pId = String(s.post_dispatch_plan_id);
    const role = String(s.role).toLowerCase();

    if (role === "driver") {
      driverByPlan.set(pId, String(s.user_id));
    } else if (role === "helper") {
      if (!helpersByPlan.has(pId)) helpersByPlan.set(pId, []);
      const u = userMap.get(String(s.user_id));
      const name = u ? `${u.fname} ${u.lname}`.trim() : "Unknown Helper";
      helpersByPlan.get(pId)!.push(name);
    }
  });

  // Build flat enriched invoice list
  const enrichedInvoices: ForArrivalInvoice[] = [];

  for (const plan of rawPlans) {
    const planIdStr = String(plan.id);
    const planInvoices = invoicesByPlan.get(planIdStr) ?? [];

    // Driver resolution: staff table first, fallback to plan.driver_id
    const driverUserId = driverByPlan.get(planIdStr) || String(plan.driver_id ?? "");
    const driverUser = userMap.get(driverUserId);
    const driverFirstName = driverUser?.fname ?? "";
    const driverLastName = driverUser?.lname ?? "";

    // Vehicle
    const vehiclePlate = vehicleMap.get(String(plan.vehicle_id ?? "")) ?? "";

    // Helpers
    const helpers = helpersByPlan.get(planIdStr) ?? [];

    // Sort invoices by sequence within this plan
    const sortedInvoices = [...planInvoices].sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    );

    for (const inv of sortedInvoices) {
      const si = salesInvoiceMap.get(String(inv.invoice_id));

      let customerCode = "";
      let customerName = "Unknown Customer";
      let brgy = "";
      let city = "";
      let province = "";

      if (si?.customer_code) {
        const cust = customerMap.get(normalizeCode(String(si.customer_code)));
        if (cust) {
          customerCode = String(cust.customer_code ?? "");
          customerName = String(cust.customer_name ?? "Unknown Customer");
          brgy = String(cust.brgy ?? "");
          city = String(cust.city ?? "");
          province = String(cust.province ?? "");
        } else {
          customerCode = String(si.customer_code);
        }
      }

      enrichedInvoices.push({
        dispatchPlanId: planIdStr,
        dispatchDocNo: String(plan.doc_no ?? ""),
        sequence: inv.sequence ?? 0,
        orderId: si ? String(si.order_id ?? "") : "",
        invoiceId: String(inv.invoice_id),
        invoiceNo: si ? String(si.invoice_no ?? "") : "",
        customerCode,
        customerName,
        brgy,
        city,
        province,
        netAmount: Number(si?.net_amount ?? 0) || 0,
        totalAmount: Number(si?.total_amount ?? 0) || 0,
        createdDate: si ? String(si.created_date ?? "") : "",
        driverFirstName,
        driverLastName,
        helperNames: helpers,
        vehiclePlate,
        invoiceStatus: String(inv.status ?? "Not Fulfilled"),
        dispatchStatus: String(plan.status ?? ""),
        estimatedTimeOfDispatch: String(plan.estimated_time_of_dispatch ?? ""),
        estimatedTimeOfArrival: String(plan.estimated_time_of_arrival ?? ""),
      });
    }
  }

  // Final sort: estimated_time_of_dispatch ASC, then sequence ASC
  enrichedInvoices.sort((a, b) => {
    const dateA = a.estimatedTimeOfDispatch || "";
    const dateB = b.estimatedTimeOfDispatch || "";
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return a.sequence - b.sequence;
  });

  return enrichedInvoices;
}
