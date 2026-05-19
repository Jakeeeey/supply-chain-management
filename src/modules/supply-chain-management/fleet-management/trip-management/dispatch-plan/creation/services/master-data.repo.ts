// ─── Dispatch Creation Module — Master Data Repository ──────
// Fetches lookup data (drivers, vehicles, branches, COA, POs).
// Consumed only by dispatch.service.ts.

import type {
  BranchOption,
  COAOption,
  DispatchCreationMasterData,
  DriverOption,
  HelperOption,
  PurchaseOrderRow,
} from "../types/dispatch.types";
import { fetchItems } from "./api";

// ─── Master Data Queries ────────────────────────────────────

/**
 * Fetches all master lookup data required for the Dispatch Creation form.
 */
export async function fetchMasterData(): Promise<DispatchCreationMasterData> {
  const [drivers, helpers, vehicles, branches, coas] = await Promise.all([
    // Fetch Drivers
    fetchItems<DriverOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Helpers
    fetchItems<HelperOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      limit: -1,
    }),
    // Fetch Vehicles
    fetchItems<{
      vehicle_id: number;
      vehicle_plate: string;
      maximum_weight?: number | string;
      vehicle_type?: { type_name?: string };
    }>("/items/vehicles", {
      "filter[status][_eq]": "Active",
      fields: "vehicle_id,vehicle_plate,maximum_weight,vehicle_type.type_name",
      limit: -1,
    }),
    // Fetch Branches (Starting Points)
    fetchItems<BranchOption>("/items/branches", {
      "filter[isActive][_eq]": 1,
      fields: "id,branch_name",
      limit: -1,
    }),
    // Fetch Chart of Accounts for Budgeting
    fetchItems<COAOption>("/items/chart_of_accounts", {
      fields: "coa_id,account_title,gl_code,account_type,is_payment",
      "filter[_and][0][account_type][_in]": "8,9",
      limit: -1,
    }),
  ]);

  return {
    drivers: drivers.data || [],
    helpers: helpers.data || [],
    vehicles: (vehicles.data || []).map((v) => ({
      vehicle_id: v.vehicle_id,
      vehicle_plate: v.vehicle_plate,
      maximum_weight: v.maximum_weight,
      vehicle_type_name: v.vehicle_type?.type_name,
    })),
    branches: branches.data || [],
    coa: coas.data || [],
  };
}

// ─── Purchase Order Queries ─────────────────────────────────

/**
 * Fetches available purchase orders for selection in route stops.
 */
export async function fetchPurchaseOrders(
  query?: string,
  branchId?: number
): Promise<PurchaseOrderRow[]> {
  const params: Record<string, string | number> = {
    fields:
      "purchase_order_id,purchase_order_no,date,supplier_name,total_amount,inventory_status",
    limit: -1,
    sort: "-date",
    "filter[inventory_status][_eq]": 11,
  };
  if (query) {
    params["filter[_and][2][purchase_order_no][_contains]"] = query;
  }
  if (branchId) {
    params["filter[_and][3][branch_id][_eq]"] = branchId;
  }
  const res = await fetchItems<PurchaseOrderRow & { inventory_status: number }>(
    "/items/purchase_order",
    params,
  );

  const poData = res.data || [];
  if (poData.length === 0) return [];

  // Fetch transaction status map to resolve numeric statuses
  const transRes = await fetchItems<{ id: number; status: string }>(
    "/items/transaction_status",
    { limit: -1, fields: "id,status" }
  );
  const statusMap = new Map((transRes.data || []).map((s) => [Number(s.id), s.status]));

  return poData.map((po) => ({
    ...po,
    inventory_status: statusMap.get(Number(po.inventory_status)) || `Status ${po.inventory_status}`,
  })) as unknown as PurchaseOrderRow[];
}
