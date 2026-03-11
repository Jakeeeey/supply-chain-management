import { fetchItems } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/api";
import {
  BranchOption,
  COAOption,
  DispatchCreationMasterData,
  DriverOption,
  HelperOption,
  VehicleOption,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";

export const dispatchCreationQueryService = {
  /**
   * Fetches all master lookup data required for the Dispatch Creation form.
   */
  async fetchMasterData(): Promise<DispatchCreationMasterData> {
    const [drivers, helpers, vehicles, branches, coas] = await Promise.all([
      // Fetch Drivers
      fetchItems<DriverOption>("/items/user", {
        "filter[user_department][_eq]": 8, // Driver department
        fields: "user_id,user_fname,user_lname",
        limit: -1,
      }),
      // Fetch Helpers
      fetchItems<HelperOption>("/items/user", {
        "filter[user_department][_eq]": 9, // Helper department
        fields: "user_id,user_fname,user_lname",
        limit: -1,
      }),
      // Fetch Vehicles
      fetchItems<VehicleOption>("/items/vehicles", {
        "filter[status][_eq]": "Active",
        fields: "vehicle_id,vehicle_plate",
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
        fields: "coa_id,account_title,gl_code",
        limit: -1,
      }),
    ]);

    return {
      drivers: drivers.data || [],
      helpers: helpers.data || [],
      vehicles: vehicles.data || [],
      branches: branches.data || [],
      coa: coas.data || [],
    };
  },

  /**
   * Fetches Approved Pre-Dispatch Plans available for conversion.
   */
  async fetchApprovedPreDispatchPlans(branchId?: number) {
    const params: Record<string, any> = {
      "filter[status][_eq]": "Picked",
      fields:
        "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount,status",
      limit: -1,
    };
    if (branchId) {
      params["filter[branch_id][_eq]"] = branchId;
    }

    const plansRes = await fetchItems<any>("/items/dispatch_plan", params);
    const plans = plansRes.data || [];

    if (!plans.length) return plansRes;

    // Enrich with Cluster Names & Item Counts
    const planIds = plans.map((p: any) => p.dispatch_id);

    const [clustersRes, detailsRes] = await Promise.all([
      fetchItems<{ id: number; cluster_name: string }>("/items/cluster", {
        fields: "id,cluster_name",
        limit: -1,
      }),
      fetchItems<{ dispatch_id: number }>("/items/dispatch_plan_details", {
        "filter[dispatch_id][_in]": planIds.join(","),
        fields: "dispatch_id",
        limit: -1,
      }),
    ]);

    const clusterMap = new Map(
      (clustersRes.data || []).map((c) => [c.id, c.cluster_name]),
    );

    const detailCountMap = new Map<number, number>();
    (detailsRes.data || []).forEach((d) => {
      detailCountMap.set(
        d.dispatch_id,
        (detailCountMap.get(d.dispatch_id) || 0) + 1,
      );
    });

    const enrichedData = plans.map((p: any) => ({
      ...p,
      cluster_name: clusterMap.get(p.cluster_id) || "Unassigned",
      total_items: detailCountMap.get(p.dispatch_id) || 0,
    }));

    return { data: enrichedData };
  },

  /**
   * Fetches details (linked sales orders) for a specific dispatch plan.
   * Returns customer name, order status, city, and amount for each linked order.
   */
  async fetchPlanDetails(planId: number) {
    // 1. Get dispatch_plan_details rows for this plan
    const detailsRes = await fetchItems<{
      detail_id: number;
      dispatch_id: number;
      sales_order_id: number;
    }>("/items/dispatch_plan_details", {
      "filter[dispatch_id][_eq]": planId,
      fields: "detail_id,dispatch_id,sales_order_id",
      limit: -1,
    });

    const details = detailsRes.data || [];
    if (!details.length) return { data: [] };

    // 2. Fetch linked sales orders (only relevant statuses)
    const soIds = details.map((d) => d.sales_order_id);
    const ordersRes = await fetchItems<{
      order_id: number;
      order_no: string;
      customer_code: string;
      order_status: string;
      total_amount: number;
      net_amount: number;
    }>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      "filter[order_status][_in]":
        "For Invoicing,For Picking,For Loading,On Hold",
      fields:
        "order_id,order_no,customer_code,order_status,total_amount,net_amount",
      limit: -1,
    });

    const orders = ordersRes.data || [];
    const orderMap = new Map(orders.map((o) => [o.order_id, o]));

    // 3. Resolve customer info
    const customerCodes = [
      ...new Set(orders.map((o) => o.customer_code).filter(Boolean)),
    ];

    let customerMap = new Map<
      string,
      {
        customer_code: string;
        customer_name: string;
        store_name?: string;
        city?: string;
      }
    >();
    if (customerCodes.length) {
      const custRes = await fetchItems<{
        customer_code: string;
        customer_name: string;
        store_name: string;
        city: string;
      }>("/items/customer", {
        "filter[customer_code][_in]": customerCodes.join(","),
        fields: "customer_code,customer_name,store_name,city",
        limit: -1,
      });
      customerMap = new Map(
        (custRes.data || []).map((c) => [c.customer_code, c]),
      );
    }

    // 4. Build enriched result
    const enrichedDetails = details.map((d) => {
      const order = orderMap.get(d.sales_order_id);
      const customer = order ? customerMap.get(order.customer_code) : undefined;
      return {
        detail_id: d.detail_id,
        sales_order_id: d.sales_order_id,
        order_no: order?.order_no || "—",
        order_status: order?.order_status || "—",
        customer_name: customer?.customer_name || customer?.store_name || "—",
        city: customer?.city || "—",
        amount: order?.net_amount ?? order?.total_amount ?? 0,
      };
    });

    return { data: enrichedDetails };
  },
};
