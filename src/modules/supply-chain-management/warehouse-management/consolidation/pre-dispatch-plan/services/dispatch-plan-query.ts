import {
  BranchOption,
  ClusterOption,
  CustomerInfo,
  DispatchPlan,
  DispatchPlanDetail,
  DriverOption,
  PaginatedDispatchPlans,
  SalesOrderOption,
  VehicleOption,
} from "../types/dispatch-plan.schema";
import { API_BASE_URL, fetchItems, request } from "./dispatch-plan-api";

export const dispatchPlanQueryService = {
  /**
   * Fetches dispatch plans with server-side pagination and optional filtering.
   */
  async fetchPlans(
    limit: number = 10,
    offset: number = 0,
    status?: string,
    search?: string,
    clusterId?: number,
  ): Promise<PaginatedDispatchPlans> {
    const params: Record<string, any> = {
      fields: "*",
      limit,
      offset,
      sort: "-created_at",
      meta: "total_count,filter_count",
    };

    if (status) {
      params["filter[status][_eq]"] = status;
    }

    if (search) {
      params["filter[dispatch_no][_icontains]"] = search;
    }

    if (clusterId) {
      params["filter[cluster_id][_eq]"] = clusterId;
    }

    const result = await fetchItems<DispatchPlan>(
      "/items/dispatch_plan",
      params,
    );
    const plans = result.data || [];

    // Enrich plans with driver, cluster, and branch names
    const enrichedPlans = await this.enrichPlans(plans);

    return {
      data: enrichedPlans,
      meta: result.meta || { total_count: 0, filter_count: 0 },
    };
  },

  /**
   * Enriches dispatch plans with related entity names (driver, cluster, branch)
   * and computes outlet count and total weight from plan details.
   */
  async enrichPlans(plans: DispatchPlan[]): Promise<DispatchPlan[]> {
    if (!plans.length) return [];

    // Fetch master data once for resolution
    const [driversRes, clustersRes, branchesRes, vehiclesRes, vehicleTypesRes] =
      await Promise.all([
        fetchItems<DriverOption>("/items/user", {
          "filter[user_department][_eq]": 8,
          fields: "user_id,user_fname,user_mname,user_lname",
          limit: -1,
        }),
        fetchItems<ClusterOption>("/items/cluster", {
          fields: "id,cluster_name",
          limit: -1,
        }),
        fetchItems<BranchOption>("/items/branches", {
          fields: "id,branch_name",
          limit: -1,
        }),
        fetchItems<VehicleOption>("/items/vehicles", {
          fields: "vehicle_id,maximum_weight,vehicle_plate,vehicle_type",
          limit: -1,
        }),
        fetchItems<{ id: number; type_name: string }>("/items/vehicle_type", {
          fields: "id,type_name",
          limit: -1,
        }),
      ]);

    const driverMap = new Map<string, string>();
    (driversRes.data || []).forEach((d) => {
      driverMap.set(
        String(d.user_id),
        [d.user_fname, d.user_mname, d.user_lname].filter(Boolean).join(" "),
      );
    });

    const clusterMap = new Map<string, string>();
    (clustersRes.data || []).forEach((c) => {
      clusterMap.set(String(c.id), c.cluster_name);
    });

    const branchMap = new Map<string, string>();
    (branchesRes.data || []).forEach((b) => {
      branchMap.set(String(b.id), b.branch_name);
    });

    const vehicleMap = new Map<string, VehicleOption>();
    (vehiclesRes.data || []).forEach((v) => {
      vehicleMap.set(String(v.vehicle_id), v);
    });

    const vehicleTypeMap = new Map<string, string>();
    (vehicleTypesRes.data || []).forEach(
      (vt: { id: number; type_name: string }) => {
        vehicleTypeMap.set(String(vt.id), vt.type_name);
      },
    );

    // Fetch details for all plans to compute outlet counts and weights
    const planIds = plans.map((p) => p.dispatch_id);
    const detailsRes = await fetchItems<{
      dispatch_id: number;
      sales_order_id: number;
    }>("/items/dispatch_plan_details", {
      "filter[dispatch_id][_in]": planIds.join(","),
      fields: "*",
      limit: -1,
    });
    const details = detailsRes.data || [];

    // Map sales order IDs to plan IDs
    const soToPlanMap = new Map<number, number>();
    for (const d of details) {
      soToPlanMap.set(d.sales_order_id, d.dispatch_id);
    }

    // Resolve Sales Order Details and Product Weights
    const soIds = details.map((d) => d.sales_order_id);
    let soWeightMap = new Map<number, number>();

    if (soIds.length) {
      // Step 1: Fetch all sales order details for these orders
      const soDetailsRes = await fetchItems<any>("/items/sales_order_details", {
        "filter[order_id][_in]": soIds.join(","),
        fields: "order_id,ordered_quantity,allocated_quantity,product_id",
        limit: -1,
      });
      const soDetails = soDetailsRes.data || [];

      // Step 2: Extract unique product IDs
      const normalizeId = (val: any) => {
        if (!val) return "";
        if (typeof val === "object")
          return String(val.product_id || val.id || "");
        return String(val);
      };

      const productIds = [
        ...new Set(
          soDetails
            .map((sod: any) => normalizeId(sod.product_id))
            .filter(Boolean),
        ),
      ];

      // Step 3: Fetch weights for all these products
      let prodWeightMap = new Map<string, number>();
      if (productIds.length) {
        const prodRes = await fetchItems<{
          product_id: number;
          weight: number | string | null;
        }>("/items/products", {
          "filter[product_id][_in]": productIds.join(","),
          fields: "product_id,weight",
          limit: -1,
        });

        prodWeightMap = new Map(
          (prodRes.data || []).map((p) => [
            String(p.product_id),
            typeof p.weight === "number"
              ? p.weight
              : parseFloat(String(p.weight)) || 0,
          ]),
        );
      }

      // Step 4: Calculate total weight per Sales Order
      for (const sod of soDetails) {
        const orderId =
          typeof sod.order_id === "object"
            ? sod.order_id?.order_id
            : sod.order_id;
        const productId = normalizeId(sod.product_id);
        const qty = Number(sod.allocated_quantity || sod.ordered_quantity || 0);
        const weight = prodWeightMap.get(productId) || 0;

        const totalWeight = qty * weight;
        if (orderId) {
          soWeightMap.set(
            orderId,
            (soWeightMap.get(orderId) || 0) + totalWeight,
          );
        }
      }
    }

    // Map results per plan
    const planWeightMap = new Map<number, number>();
    const outletCountMap = new Map<number, number>();

    for (const d of details) {
      outletCountMap.set(
        d.dispatch_id,
        (outletCountMap.get(d.dispatch_id) || 0) + 1,
      );
      const soWeight = soWeightMap.get(d.sales_order_id) || 0;
      planWeightMap.set(
        d.dispatch_id,
        (planWeightMap.get(d.dispatch_id) || 0) + soWeight,
      );
    }

    return plans.map((plan) => {
      const planId = plan.dispatch_id;
      const totalWeight = planWeightMap.get(planId) || 0;

      // Robust vehicle lookup (handle string/number and potential alternate field)
      const rawVeId = plan.vehicle_id ?? (plan as any).vehicle;
      const veId =
        rawVeId && typeof rawVeId === "object"
          ? String(rawVeId.vehicle_id || rawVeId.id)
          : rawVeId
            ? String(rawVeId)
            : null;

      const vehicle = veId ? vehicleMap.get(veId) : null;
      const maxWeight = vehicle
        ? typeof vehicle.maximum_weight === "number"
          ? vehicle.maximum_weight
          : parseFloat(String(vehicle.maximum_weight)) || 0
        : 0;
      const capacityPercent =
        maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0;

      return {
        ...plan,
        vehicle_id: veId ? Number(veId) : null,
        driver_id: plan.driver_id ? Number(String(plan.driver_id)) : null,
        cluster_id: plan.cluster_id ? Number(String(plan.cluster_id)) : null,
        branch_id: plan.branch_id ? Number(String(plan.branch_id)) : null,
        driver_name: plan.driver_id
          ? driverMap.get(String(plan.driver_id)) || "Unknown"
          : "\u2014",
        cluster_name: plan.cluster_id
          ? clusterMap.get(String(plan.cluster_id)) || "\u2014"
          : "\u2014",
        branch_name: plan.branch_id
          ? branchMap.get(String(plan.branch_id)) || "\u2014"
          : "\u2014",
        outlet_count: outletCountMap.get(planId) || 0,
        total_weight: totalWeight,
        maximum_weight: maxWeight,
        capacity_percentage: capacityPercent,
        vehicle_plate: vehicle?.vehicle_plate || "\u2014",
        vehicle_type_name: vehicle?.vehicle_type
          ? vehicleTypeMap.get(String(vehicle.vehicle_type)) || "Unknown Type"
          : "\u2014",
      };
    });
  },

  /**
   * Fetches a single dispatch plan with its full details.
   */
  async fetchPlanById(
    id: number | string,
  ): Promise<{ plan: DispatchPlan; details: DispatchPlanDetail[] }> {
    const baseUrl = API_BASE_URL?.replace(/\/$/, "");

    // Fetch the plan record
    const planResult = await request<{ data: DispatchPlan }>(
      `${baseUrl}/items/dispatch_plan/${id}`,
    );
    const plan = planResult.data;

    // Fetch related details
    const detailsRes = await fetchItems<{
      detail_id: number;
      dispatch_id: number;
      sales_order_id: number;
    }>("/items/dispatch_plan_details", {
      "filter[dispatch_id][_eq]": id,
      fields: "*",
      limit: -1,
    });

    const rawDetails = detailsRes.data || [];

    // Enrich with sales order and customer data
    const enrichedDetails: DispatchPlanDetail[] = [];
    if (rawDetails.length) {
      const soIds = rawDetails.map((d) => d.sales_order_id);
      const [ordersRes] = await Promise.all([
        fetchItems<{
          order_id: number;
          order_no: string;
          customer_code: string;
          total_amount: number;
          net_amount: number;
          po_no: string | null;
        }>("/items/sales_order", {
          "filter[order_id][_in]": soIds.join(","),
          fields:
            "order_id,order_no,customer_code,total_amount,net_amount,po_no",
          limit: -1,
        }),
      ]);

      const orderMap = new Map(
        (ordersRes.data || []).map((o) => [o.order_id, o]),
      );

      // Resolve customer names
      const customerCodes = [
        ...new Set(
          (ordersRes.data || []).map((o) => o.customer_code).filter(Boolean),
        ),
      ];

      let customerMap = new Map<string, CustomerInfo>();
      if (customerCodes.length) {
        const custRes = await fetchItems<CustomerInfo>("/items/customer", {
          "filter[customer_code][_in]": customerCodes.join(","),
          fields: "id,customer_code,customer_name,store_name,city,province",
          limit: -1,
        });
        customerMap = new Map(
          (custRes.data || []).map((c) => [c.customer_code, c]),
        );
      }

      for (const detail of rawDetails) {
        const order = orderMap.get(detail.sales_order_id);
        const customer = order
          ? customerMap.get(order.customer_code)
          : undefined;

        enrichedDetails.push({
          detail_id: detail.detail_id,
          dispatch_id: detail.dispatch_id,
          sales_order_id: detail.sales_order_id,
          order_no: order?.order_no,
          customer_name:
            customer?.customer_name || customer?.store_name || "\u2014",
          city: customer?.city ?? undefined,
          province: customer?.province ?? undefined,
          amount: order?.net_amount ?? order?.total_amount ?? 0,
          po_no: order?.po_no ?? undefined,
        } as any);
      }
    }

    // Enrich plan with driver/cluster/branch
    const enrichedPlans = await this.enrichPlans([plan]);

    return {
      plan: enrichedPlans[0],
      details: enrichedDetails,
    };
  },

  /**
   * Fetches sales orders available for dispatch planning.
   */
  async fetchAvailableOrders(
    clusterId?: number,
    search?: string,
  ): Promise<SalesOrderOption[]> {
    // Step 1: Get allowed areas for the cluster
    let allowedAreas: { province: string; city: string }[] = [];
    if (clusterId) {
      const areasRes = await fetchItems<{ province: string; city: string }>(
        "/items/area_per_cluster",
        {
          "filter[cluster_id][_eq]": clusterId,
          fields: "province,city",
          limit: -1,
        },
      );
      allowedAreas = areasRes.data || [];
    }

    // Step 2: Fetch sales order details as the base table (Detail-First approach)
    const detailsParams: Record<string, any> = {
      "filter[order_id][order_status][_eq]": "For Consolidation",
      fields:
        "ordered_quantity,allocated_quantity,product_id,order_id.order_id,order_id.order_no,order_id.customer_code,order_id.total_amount,order_id.net_amount,order_id.allocated_amount,order_id.po_no",
      limit: -1,
    };

    if (search) {
      detailsParams["filter[order_id][order_no][_contains]"] = search;
    }

    const detailsRes = await fetchItems<any>(
      "/items/sales_order_details",
      detailsParams,
    );
    const details = detailsRes.data || [];

    if (!details.length) return [];

    // Step 3: Resolve Product Weights
    const normalizeId = (val: any) => {
      if (!val) return "";
      if (typeof val === "object")
        return String(val.product_id || val.id || "");
      return String(val);
    };

    const productIds = [
      ...new Set(
        details.map((d: any) => normalizeId(d.product_id)).filter(Boolean),
      ),
    ];

    let prodWeightMap = new Map<string, number>();
    if (productIds.length) {
      const prodRes = await fetchItems<{
        product_id: number;
        weight: number | string | null;
      }>("/items/products", {
        "filter[product_id][_in]": productIds.join(","),
        fields: "product_id,weight",
        limit: -1,
      });

      prodWeightMap = new Map(
        (prodRes.data || []).map((p) => [
          String(p.product_id),
          typeof p.weight === "number"
            ? p.weight
            : parseFloat(String(p.weight)) || 0,
        ]),
      );
    }

    // Step 4: Group by Order and calculate total weights
    const tempOrderMap = new Map<number, any>();
    const orderList: any[] = [];

    for (const d of details) {
      const rawOrder = d.order_id;
      if (!rawOrder) continue;

      if (!tempOrderMap.has(rawOrder.order_id)) {
        const orderData = {
          ...rawOrder,
          total_weight: 0,
        };
        tempOrderMap.set(rawOrder.order_id, orderData);
        orderList.push(orderData);
      }

      const orderData = tempOrderMap.get(rawOrder.order_id);
      const productId = normalizeId(d.product_id);
      const productKey = String(productId);
      const qty = Number(d.allocated_quantity || d.ordered_quantity || 1);

      const itemWeight = (prodWeightMap.get(productKey) || 0) * qty;
      orderData.total_weight += itemWeight;
    }

    // Step 5: Resolve Customer Info (Bulk fetch by customer_code)
    const customerCodes = [...new Set(orderList.map((o) => o.customer_code))];
    let customerMap = new Map<string, CustomerInfo>();
    if (customerCodes.length) {
      const custRes = await fetchItems<CustomerInfo>("/items/customer", {
        "filter[customer_code][_in]": customerCodes.join(","),
        fields: "id,customer_code,customer_name,store_name,brgy,city,province",
        limit: -1,
      });
      customerMap = new Map(
        (custRes.data || []).map((c) => [c.customer_code, c]),
      );
    }

    // Step 6: Filter by Cluster Area and Exclude Assigned Orders
    const allOrderIds = orderList.map((o) => o.order_id);
    let assignedOrderIds = new Set<number>();
    if (allOrderIds.length) {
      const assignedRes = await fetchItems<{ sales_order_id: number }>(
        "/items/dispatch_plan_details",
        {
          "filter[sales_order_id][_in]": allOrderIds.join(","),
          fields: "sales_order_id",
          limit: -1,
        },
      );
      assignedOrderIds = new Set(
        (assignedRes.data || []).map((d) => d.sales_order_id),
      );
    }

    // Final construction and filtering
    return orderList
      .filter((o) => !assignedOrderIds.has(o.order_id))
      .filter((o) => {
        if (!clusterId || !allowedAreas.length) return true;
        const customer = customerMap.get(o.customer_code);
        if (!customer) return false;
        return allowedAreas.some(
          (area) =>
            area.province?.toUpperCase() === customer.province?.toUpperCase() &&
            area.city?.toUpperCase() === customer.city?.toUpperCase(),
        );
      })
      .map((o) => {
        const customer = customerMap.get(o.customer_code);
        return {
          order_id: o.order_id,
          order_no: o.order_no,
          customer_code: o.customer_code,
          customer_name: customer?.customer_name || "\u2014",
          store_name: customer?.store_name || undefined,
          city: customer?.city || undefined,
          province: customer?.province || undefined,
          total_amount: o.total_amount,
          net_amount: o.net_amount,
          allocated_amount: o.allocated_amount,
          po_no: o.po_no,
          total_weight: o.total_weight,
        };
      });
  },
};
