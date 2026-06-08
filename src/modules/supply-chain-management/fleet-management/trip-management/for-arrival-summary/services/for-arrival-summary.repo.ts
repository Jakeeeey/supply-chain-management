import {
  PostDispatchPlanRow,
  PostDispatchPlanStaffRow,
  PostDispatchInvoiceRow,
  SalesInvoiceRow,
  CustomerRow,
  UserRow,
  VehicleRow,
} from "../types/for-arrival-summary.types";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders(): Record<string, string> {
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
  const json = (await res.json()) as { data: T };
  return { ok: true as const, json };
}

/**
 * Fetches all necessary Directus collections in parallel.
 * Pure I/O, no orchestration.
 */
export async function fetchForArrivalSummaryData() {
  if (!DIRECTUS_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const [
    plansRes,
    staffRes,
    invRes,
    salesInvRes,
    customersRes,
    usersRes,
    vehiclesRes,
  ] = await Promise.all([
    fetchDirectus<PostDispatchPlanRow[]>(
      `/items/post_dispatch_plan?limit=-1&fields=id,doc_no,driver_id,vehicle_id,status,estimated_time_of_dispatch,estimated_time_of_arrival,time_of_dispatch,remarks&filter[status][_eq]=For Inbound&sort=estimated_time_of_dispatch`,
    ),
    fetchDirectus<PostDispatchPlanStaffRow[]>(
      `/items/post_dispatch_plan_staff?limit=-1&fields=post_dispatch_plan_id,user_id,role,is_present`,
    ),
    fetchDirectus<PostDispatchInvoiceRow[]>(
      `/items/post_dispatch_invoices?limit=-1&fields=id,post_dispatch_plan_id,invoice_id,sequence,status,distance,remarks`,
    ),
    fetchDirectus<SalesInvoiceRow[]>(
      `/items/sales_invoice?limit=-1&fields=invoice_id,order_id,invoice_no,customer_code,total_amount,net_amount,created_date,transaction_status`,
    ),
    fetchDirectus<CustomerRow[]>(
      `/items/customer?limit=-1&fields=customer_code,customer_name,brgy,city,province`,
    ),
    fetchDirectus<UserRow[]>(
      `/items/user?limit=-1&fields=user_id,user_fname,user_lname`,
    ),
    fetchDirectus<VehicleRow[]>(
      `/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate`,
    ),
  ]);

  const allResults = [plansRes, staffRes, invRes, salesInvRes, customersRes, usersRes, vehiclesRes];
  const failed = allResults.find((x) => !x.ok);
  if (failed && !failed.ok) {
    throw new Error(
      `Upstream request failed (Status ${failed.status}): ${failed.body}`
    );
  }

  return {
    rawPlans: (plansRes as { ok: true; json: { data: PostDispatchPlanRow[] } }).json?.data ?? [],
    staff: (staffRes as { ok: true; json: { data: PostDispatchPlanStaffRow[] } }).json?.data ?? [],
    dispatchInvoices: (invRes as { ok: true; json: { data: PostDispatchInvoiceRow[] } }).json?.data ?? [],
    salesInvoices: (salesInvRes as { ok: true; json: { data: SalesInvoiceRow[] } }).json?.data ?? [],
    customers: (customersRes as { ok: true; json: { data: CustomerRow[] } }).json?.data ?? [],
    users: (usersRes as { ok: true; json: { data: UserRow[] } }).json?.data ?? [],
    vehicles: (vehiclesRes as { ok: true; json: { data: VehicleRow[] } }).json?.data ?? [],
  };
}

/**
 * Client-side fetch function (calls our thin Next.js route).
 * Used by the React Hook.
 */
export async function fetchForArrivalSummaryClient() {
  const res = await fetch(
    `/api/scm/fleet-management/trip-management/for-arrival-summary`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch for-arrival summary");
  }

  const json = await res.json();
  return json?.data ?? [];
}
