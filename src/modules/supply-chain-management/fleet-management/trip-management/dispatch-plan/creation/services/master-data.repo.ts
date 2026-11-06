// ─── Dispatch Creation Module — Master Data Repository ──────
// Fetches lookup data (drivers, vehicles, branches, COA, clusters, cluster_coa_budgets, POs).
// Consumed only by dispatch.service.ts.

import type {
  BranchOption,
  ClusterCoaBudgetRow,
  ClusterRow,
  COAOption,
  DispatchCreationMasterData,
  DriverOption,
  HelperOption,
  PurchaseOrderRow,
} from "../types/dispatch.types";
import { fetchItems } from "./api";

// ─── Master Data Queries ────────────────────────────────────

/**
 * Checks whether `general_setting.setting_key === 'dispatch_auto_approval'` has `setting_value === '1'`.
 */
export async function fetchDispatchAutoApprovalSetting(): Promise<boolean> {
  try {
    const res = await fetchItems<{ setting_key: string; setting_value: string | number | null }>(
      "/items/general_setting",
      {
        "filter[setting_key][_eq]": "dispatch_auto_approval",
        fields: "setting_key,setting_value",
        limit: 1,
      },
    );
    const val = res.data?.[0]?.setting_value;
    return String(val ?? "").trim() === "1";
  } catch {
    return false;
  }
}

/**
 * Fetches all master lookup data required for the Dispatch Creation form.
 */
export async function fetchMasterData(): Promise<DispatchCreationMasterData> {
  const [drivers, helpers, vehicles, branches, coas, allCoas, clusters, clusterCoaBudgets, isAutoApprovalEnabled] = await Promise.all([
    // Fetch Drivers
    fetchItems<DriverOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      "filter[position_id][_eq]": 1000,
      limit: -1,
    }),
    // Fetch Helpers
    fetchItems<HelperOption>("/items/user", {
      fields: "user_id,user_fname,user_lname",
      "filter[position_id][_eq]": 1001,
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
    // Fetch Chart of Accounts for Budgeting (filtered for manual lines)
    fetchItems<COAOption>("/items/chart_of_accounts", {
      fields: "coa_id,account_title,gl_code,account_type,is_payment",
      "filter[_and][0][account_type][_in]": "8,9",
      limit: -1,
    }),
    // Fetch all Chart of Accounts for Cluster COA Budget resolution
    fetchItems<COAOption>("/items/chart_of_accounts", {
      fields: "coa_id,account_title,gl_code",
      limit: -1,
    }).catch(() => ({ data: [] as COAOption[] })),
    // Fetch Clusters with proximity_level
    fetchItems<ClusterRow>("/items/cluster", {
      fields: "id,cluster_name,proximity_level",
      limit: -1,
    }).catch(() => ({ data: [] as ClusterRow[] })),
    // Fetch Cluster COA Budgets
    fetchItems<ClusterCoaBudgetRow>("/items/cluster_coa_budget", {
      fields: "id,cluster_id,coa_id,budget",
      limit: -1,
    }).catch(() => ({ data: [] as ClusterCoaBudgetRow[] })),
    // Fetch dispatch_auto_approval setting
    fetchDispatchAutoApprovalSetting(),
  ]);

  const coaMap = new Map<number, COAOption>();
  for (const c of allCoas.data || []) {
    coaMap.set(Number(c.coa_id), c);
  }
  for (const c of coas.data || []) {
    if (!coaMap.has(Number(c.coa_id))) {
      coaMap.set(Number(c.coa_id), c);
    }
  }

  const enrichedClusterBudgets: ClusterCoaBudgetRow[] = (clusterCoaBudgets.data || []).map((b) => {
    const coa = coaMap.get(Number(b.coa_id));
    return {
      ...b,
      cluster_id: Number(b.cluster_id),
      coa_id: Number(b.coa_id),
      budget: Number(b.budget || 0),
      account_title: coa?.account_title || `COA #${b.coa_id}`,
      gl_code: coa?.gl_code || "—",
    };
  });

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
    clusters: clusters.data || [],
    cluster_coa_budgets: enrichedClusterBudgets,
    isAutoApprovalEnabled,
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
