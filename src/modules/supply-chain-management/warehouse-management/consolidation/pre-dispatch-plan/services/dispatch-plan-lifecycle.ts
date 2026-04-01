import {
  DispatchPlan,
  DispatchPlanFormValues,
} from "../types/dispatch-plan.schema";
import {
  API_BASE_URL,
  fetchItems,
  fetchItemsInChunks,
  request,
} from "./dispatch-plan-api";
import { dispatchPlanDataService } from "./dispatch-plan-data";

export const dispatchPlanLifecycleService = {
  /**
   * Creates a new dispatch plan and its detail records.
   */
  async createPlan(values: DispatchPlanFormValues): Promise<DispatchPlan> {
    const baseUrl = API_BASE_URL?.replace(/\/$/, "");

    // Generate dispatch number
    const dispatchNo = await dispatchPlanDataService.generateDispatchNo();

    // Compute total amount from selected sales orders
    let totalAmount = 0;
    if (values.sales_order_ids.length) {
      const { data: orders } = await fetchItemsInChunks<{
        order_id: number;
        net_amount: number;
        total_amount: number;
        allocated_amount: number | null;
      }>("/items/sales_order", "order_id", values.sales_order_ids, {
        fields: "order_id,net_amount,total_amount,allocated_amount",
        limit: -1,
      });
      totalAmount = orders.reduce(
        (sum, o) =>
          sum + (o.allocated_amount ?? o.net_amount ?? o.total_amount ?? 0),
        0,
      );
    }

    // Create the dispatch plan record
    const planResult = await request<{ data: DispatchPlan }>(
      `${baseUrl}/items/dispatch_plan`,
      {
        method: "POST",
        body: JSON.stringify({
          dispatch_no: dispatchNo,
          dispatch_date: values.dispatch_date,
          driver_id: values.driver_id,
          branch_id: values.branch_id,
          cluster_id: values.cluster_id,
          vehicle_id: values.vehicle_id,
          vehicle: values.vehicle_id, // Include both to handle Directus naming inconsistencies
          status: "Pending",
          total_amount: totalAmount,
          remarks: values.remarks || "",
        }),
      },
    );

    const createdPlan = planResult.data;

    // Create detail (junction) records for each sales order
    if (values.sales_order_ids.length) {
      await Promise.all(
        values.sales_order_ids.map((soId) =>
          request(`${baseUrl}/items/dispatch_plan_details`, {
            method: "POST",
            body: JSON.stringify({
              dispatch_id: createdPlan.dispatch_id,
              sales_order_id: soId,
            }),
          }),
        ),
      );
    }

    return createdPlan;
  },

  /**
   * Updates an existing dispatch plan and replaces its detail records.
   */
  async updatePlan(
    id: number | string,
    values: DispatchPlanFormValues,
  ): Promise<void> {
    const baseUrl = API_BASE_URL?.replace(/\/$/, "");

    // Recompute total amount
    let totalAmount = 0;
    if (values.sales_order_ids.length) {
      const { data: orders } = await fetchItemsInChunks<{
        order_id: number;
        net_amount: number;
        total_amount: number;
        allocated_amount: number | null;
      }>("/items/sales_order", "order_id", values.sales_order_ids, {
        fields: "order_id,net_amount,total_amount,allocated_amount",
        limit: -1,
      });
      totalAmount = orders.reduce(
        (sum, o) =>
          sum + (o.allocated_amount ?? o.net_amount ?? o.total_amount ?? 0),
        0,
      );
    }

    // Update the plan record
    await request(`${baseUrl}/items/dispatch_plan/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        dispatch_date: values.dispatch_date,
        driver_id: values.driver_id,
        branch_id: values.branch_id,
        cluster_id: values.cluster_id,
        vehicle_id: values.vehicle_id,
        vehicle: values.vehicle_id, // Include both to handle Directus naming inconsistencies
        total_amount: totalAmount,
        remarks: values.remarks || "",
      }),
    });

    // Delete existing detail records
    const existingDetails = await fetchItems<{ detail_id: number }>(
      "/items/dispatch_plan_details",
      {
        "filter[dispatch_id][_eq]": id,
        fields: "detail_id",
        limit: -1,
      },
    );

    if (existingDetails.data?.length) {
      await Promise.all(
        existingDetails.data.map((d) =>
          request(`${baseUrl}/items/dispatch_plan_details/${d.detail_id}`, {
            method: "DELETE",
          }),
        ),
      );
    }

    // Create new detail records
    if (values.sales_order_ids.length) {
      await Promise.all(
        values.sales_order_ids.map((soId) =>
          request(`${baseUrl}/items/dispatch_plan_details`, {
            method: "POST",
            body: JSON.stringify({
              dispatch_id: Number(id),
              sales_order_id: soId,
            }),
          }),
        ),
      );
    }
  },

  /**
   * Approves a dispatch plan by updating its status to 'Approved'.
   */
  async approvePlan(id: number | string): Promise<void> {
    const baseUrl = API_BASE_URL?.replace(/\/$/, "");
    await request(`${baseUrl}/items/dispatch_plan/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Approved" }),
    });
  },
};
