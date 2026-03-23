import { fetchItems } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/api";
import {
  BranchOption,
  COAOption,
  DispatchCreationMasterData,
  DriverOption,
  HelperOption,
  VehicleOption,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";

const READY_STATUSES = ["For Loading", "On Hold"];

interface RawDispatchPlan {
  dispatch_id: number;
  dispatch_no: string;
  driver_id?: number;
  vehicle_id?: number;
  cluster_id?: number;
  branch_id?: number;
  total_amount: number;
  status: string;
}

interface RawSalesOrder {
  order_id: number;
  order_no: string;
  order_status: string;
  customer_code?: string;
  total_amount?: number;
  net_amount?: number;
}

interface RawSalesInvoice {
  invoice_id: number;
  order_id: string;
  transaction_status: string;
}

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
   * Fetches full details for a specific post-dispatch plan, including assigned staff.
   */
  async fetchPostDispatchPlanDetails(planId: number) {
    const [planRes, staffRes, junctionRes] = await Promise.all([
      fetchItems<any>("/items/post_dispatch_plan", {
        "filter[id][_eq]": planId,
        fields: "*",
        limit: 1,
      }),
      fetchItems<any>("/items/post_dispatch_plan_staff", {
        "filter[post_dispatch_plan_id][_eq]": planId,
        fields: "user_id,role",
        limit: -1,
      }),
      fetchItems<any>("/items/post_dispatch_dispatch_plans", {
        "filter[post_dispatch_plan_id][_eq]": planId,
        fields: "dispatch_plan_id",
        limit: 1,
      }),
    ]);

    const planData = planRes.data?.[0];
    if (!planData) {
      throw new Error(`Post-dispatch plan with ID ${planId} not found`);
    }

    const staff = staffRes.data || [];
    const driver = staff.find((s: any) => s.role === "Driver");
    const helpers = staff.filter((s: any) => s.role === "Helper");
    const linkedPdp = junctionRes.data?.[0];

    return {
      ...planData,
      dispatch_id: linkedPdp?.dispatch_plan_id || planData.dispatch_id,
      driver_id: driver?.user_id,
      helpers: helpers.map((h: any) => ({ user_id: h.user_id })),
    };
  },

  /**
   * Fetches Approved Pre-Dispatch Plans available for conversion.
   */
  async fetchApprovedPreDispatchPlans(branchId?: number, currentPlanId?: number) {
    const params: Record<string, any> = {
      "filter[_or][0][status][_eq]": "Picked",
      fields: "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount,status",
      limit: -1,
    };

    if (currentPlanId) {
      params["filter[_or][1][dispatch_id][_eq]"] = currentPlanId;
    }
    if (branchId) {
      params["filter[branch_id][_eq]"] = branchId;
    }

    const plansRes = await fetchItems<RawDispatchPlan>("/items/dispatch_plan", params);
    const plans = plansRes.data || [];

    if (!plans.length) return plansRes;

    const planIds = plans.map((p) => p.dispatch_id);

    const [clustersRes, detailsRes] = await Promise.all([
      fetchItems<{ id: number; cluster_name: string }>("/items/cluster", {
        fields: "id,cluster_name",
        limit: -1,
      }),
      fetchItems<{ dispatch_id: number; sales_order_id: number }>(
        "/items/dispatch_plan_details",
        {
          "filter[dispatch_id][_in]": planIds.join(","),
          fields: "dispatch_id,sales_order_id",
          limit: -1,
        },
      ),
    ]);

    const details = detailsRes.data || [];
    const soIds = [...new Set(details.map((d) => d.sales_order_id))];
    if (!soIds.length) return { data: [] };

    const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_id,order_no,order_status",
      limit: -1,
    });

    const orders = ordersRes.data || [];
    const orderNos = orders.map((o) => o.order_no).filter(Boolean);

    let invoicesRes: { data: RawSalesInvoice[] } | undefined;
    if (orderNos.length) {
      invoicesRes = await fetchItems<RawSalesInvoice>("/items/sales_invoice", {
        "filter[order_id][_in]": orderNos.join(","),
        fields: "invoice_id,order_id,transaction_status",
        limit: -1,
      });
    }

    const orderIdToMapData = new Map(orders.map((o) => [o.order_id, { no: o.order_no, status: o.order_status }]));
    const invoiceMap = new Map((invoicesRes?.data || []).map((i) => [i.order_id, i.transaction_status]));
    const clusterMap = new Map((clustersRes.data || []).map((c) => [c.id, c.cluster_name]));

    const detailCountMap = new Map<number, number>();
    details.forEach((d) => {
      const planId = d.dispatch_id;
      const orderData = orderIdToMapData.get(d.sales_order_id);
      if (!planId || !orderData) return;

      const invoiceStatus = invoiceMap.get(orderData.no);
      const isReady =
        READY_STATUSES.includes(orderData.status) ||
        (invoiceStatus && READY_STATUSES.includes(invoiceStatus));

      if (isReady) {
        detailCountMap.set(planId, (detailCountMap.get(planId) || 0) + 1);
      }
    });

    const enrichedData = plans
      .map((p) => {
        const planId = p.dispatch_id;
        return {
          ...p,
          cluster_name: clusterMap.get(p.cluster_id || -1) || "Unassigned",
          total_items: detailCountMap.get(planId) || 0,
        };
      })
      .filter((p) => p.total_items > 0);

    return { data: enrichedData };
  },

  /**
   * Fetches details (linked sales orders) for a specific dispatch plan.
   * Returns customer name, order status, city, and amount for each linked order.
   */
  async fetchPlanDetails(planId: number, tripId?: number) {
    let details: { id?: number; sales_order_id: number; invoice_id?: number; sequence?: number }[] = [];

    if (tripId) {
      // 1a. Fetch from post_dispatch_invoices for an existing trip
      const tripInvoicesRes = await fetchItems<{
        id: number;
        invoice_id: number;
        sequence: number;
      }>("/items/post_dispatch_invoices", {
        "filter[post_dispatch_plan_id][_eq]": tripId,
        fields: "id,invoice_id,sequence",
        sort: "sequence",
        limit: -1,
      });

      const tripInvoices = tripInvoicesRes.data || [];
      if (tripInvoices.length > 0) {
        const invIds = tripInvoices.map((ti) => ti.invoice_id);
        const invoicesRes = await fetchItems<RawSalesInvoice>(
          "/items/sales_invoice",
          {
            "filter[invoice_id][_in]": invIds.join(","),
            fields: "invoice_id,order_id",
            limit: -1,
          }
        );
        const invToOrderMap = new Map((invoicesRes.data || []).map(i => [i.invoice_id, i.order_id]));
        
        const orderRes = await fetchItems<RawSalesOrder>(
          "/items/sales_order",
          {
            "filter[order_no][_in]": Array.from(invToOrderMap.values()).join(","),
            fields: "order_id,order_no",
            limit: -1,
          }
        );
        const orderNoToIdMap = new Map((orderRes.data || []).map(o => [o.order_no, o.order_id]));

        details = tripInvoices.map(ti => {
          const orderNo = invToOrderMap.get(ti.invoice_id);
          const soId = orderNo ? orderNoToIdMap.get(orderNo) : undefined;
          return {
            id: ti.id,
            invoice_id: ti.invoice_id,
            sales_order_id: soId || 0,
            sequence: ti.sequence,
          };
        }).filter(d => d.sales_order_id > 0);
      }
    } else {
      // 1b. Get dispatch_plan_details rows for this plan (standard PDP enrichment)
      const detailsRes = await fetchItems<{
        detail_id: number;
        dispatch_id: number;
        sales_order_id: number;
      }>("/items/dispatch_plan_details", {
        "filter[dispatch_id][_eq]": planId,
        fields: "detail_id,dispatch_id,sales_order_id",
        limit: -1,
      });
      details = (detailsRes.data || []).map(d => ({
        id: d.detail_id,
        sales_order_id: d.sales_order_id,
      }));
    }

    if (!details.length) return { data: [] };

    const soIds = details.map((d) => d.sales_order_id);
    const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_id,order_no,customer_code,order_status,total_amount,net_amount",
      limit: -1,
    });

    const orders = ordersRes.data || [];
    const orderMap = new Map(orders.map((o) => [o.order_id, o]));

    const orderNos = orders.map((o) => o.order_no).filter(Boolean);
    let invoiceMap = new Map<string, RawSalesInvoice>();

    if (orderNos.length) {
      const invoicesRes = await fetchItems<RawSalesInvoice>("/items/sales_invoice", {
        "filter[order_id][_in]": orderNos.join(","),
        fields: "invoice_id,order_id,transaction_status",
        limit: -1,
      });
      invoiceMap = new Map((invoicesRes.data || []).map((i) => [i.order_id, i]));
    }

    const customerCodes = [...new Set(orders.map((o) => o.customer_code).filter((c): c is string => !!c))];

    let customerMap = new Map<string, { customer_code: string; customer_name: string; store_name?: string; city?: string }>();
    if (customerCodes.length) {
      const custRes = await fetchItems<{ customer_code: string; customer_name: string; store_name: string; city: string }>("/items/customer", {
        "filter[customer_code][_in]": customerCodes.join(","),
        fields: "customer_code,customer_name,store_name,city",
        limit: -1,
      });
      customerMap = new Map((custRes.data || []).map((c) => [c.customer_code, c]));
    }

    const enrichedDetails = details
      .map((d) => {
        const order = orderMap.get(d.sales_order_id);
        if (!order) return null;

        const customer = order.customer_code ? customerMap.get(order.customer_code) : undefined;
        const invoice = invoiceMap.get(order.order_no);

        const orderStatus = order.order_status || "—";
        const isReady = READY_STATUSES.includes(orderStatus);

        if (!isReady) return null;

        return {
          detail_id: d.id,
          sales_order_id: d.sales_order_id,
          invoice_id: invoice?.invoice_id || d.invoice_id,
          order_no: order.order_no || "—",
          order_status: invoice?.transaction_status || orderStatus,
          true_order_status: orderStatus,
          customer_name: customer?.customer_name || customer?.store_name || "—",
          city: customer?.city || "—",
          amount: order.net_amount ?? order.total_amount ?? 0,
        };
      })
      .filter((d): d is any => d !== null);

    return { data: enrichedDetails };
  },

  /**
   * Fetches all post-dispatch budgets for enrichment.
   */
  async fetchAllBudgets() {
    const res = await fetchItems<any>("/items/post_dispatch_budgeting", {
      limit: -1,
      fields: "post_dispatch_plan_id,amount",
    });
    return res.data || [];
  },

  /**
   * Fetches budgets for a specific dispatch plan.
   */
  async fetchPlanBudgets(planId: number) {
    const res = await fetchItems<any>("/items/post_dispatch_budgeting", {
      "filter[post_dispatch_plan_id][_eq]": planId,
      fields: "coa_id,amount,remarks",
      limit: -1,
    });
    return res.data || [];
  },

  /**
   * Fetches only the invoice IDs (PK) associated with a PDP.
   * Useful for persisting links in post_dispatch_invoices.
   */
  async fetchPdpInvoiceIds(pdpId: number): Promise<number[]> {
    const detailsRes = await fetchItems<{ sales_order_id: number }>(
      "/items/dispatch_plan_details",
      {
        "filter[dispatch_id][_eq]": pdpId,
        fields: "sales_order_id",
        limit: -1,
      },
    );
    const details = detailsRes.data || [];
    if (!details.length) return [];

    const soIds = details.map((d) => d.sales_order_id);
    const ordersRes = await fetchItems<{ order_no: string }>(
      "/items/sales_order",
      {
        "filter[order_id][_in]": soIds.join(","),
        fields: "order_no",
        limit: -1,
      },
    );
    const orderNos = (ordersRes.data || [])
      .map((o) => o.order_no)
      .filter(Boolean);
    if (!orderNos.length) return [];

    const invoicesRes = await fetchItems<{ invoice_id: number }>(
      "/items/sales_invoice",
      {
        "filter[order_id][_in]": orderNos.join(","),
        fields: "invoice_id",
        limit: -1,
      },
    );
    return (invoicesRes.data || []).map((i) => i.invoice_id);
  },
};
