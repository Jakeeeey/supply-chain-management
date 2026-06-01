// ─── Dispatch Creation Module — PDP Enrichment Repository ───
// Enriches Pre-Dispatch Plans with cluster, weight, and readiness.
// Consumed only by dispatch.service.ts.

import type {
  ClusterRow,
  ConsolidatorDetailRow,
  ConsolidatorDispatchRow,
  DirectusResponse,
  EnrichedApprovedPlan,
  RawDispatchPlan,
  RawSalesOrder,
} from "../types/dispatch.types";
import { fetchItems, fetchItemsInChunks } from "./api";

const READY_STATUSES = ["For Loading", "On Hold"];

/**
 * Fetches Approved Pre-Dispatch Plans available for conversion.
 * Enriches each plan with cluster name and ready-item count.
 */
export async function fetchApprovedPreDispatchPlans(
  branchId?: number,
  currentPlanId?: number | number[],
  limit: number = 25,
  offset: number = 0,
  search?: string
): Promise<DirectusResponse<EnrichedApprovedPlan>> {
  const params: Record<string, string | number> = {
    fields:
      "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount,status",
    limit,
    offset,
    sort: "-dispatch_id"
  };

  // Build a permissive filter:
  // ( (status = 'Picked' AND branch_id = branchId) OR (dispatch_id IN currentPlanId) )
  if (currentPlanId && branchId) {
    const ids = Array.isArray(currentPlanId)
      ? currentPlanId.join(",")
      : currentPlanId;
    if (search) {
        params["filter[_and][0][_or][0][_and][0][status][_eq]"] = "Picked";
        params["filter[_and][0][_or][0][_and][1][branch_id][_eq]"] = branchId;
        params["filter[_and][0][_or][1][dispatch_id][_in]"] = ids;
        params["filter[_and][1][dispatch_no][_icontains]"] = search;
    } else {
        params["filter[_or][0][_and][0][status][_eq]"] = "Picked";
        params["filter[_or][0][_and][1][branch_id][_eq]"] = branchId;
        params["filter[_or][1][dispatch_id][_in]"] = ids;
    }
  } else if (branchId) {
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][status][_eq]" : "filter[status][_eq]"] = "Picked";
    params[search ? "filter[_and][2][branch_id][_eq]" : "filter[branch_id][_eq]"] = branchId;
  } else if (currentPlanId) {
    const ids = Array.isArray(currentPlanId)
      ? currentPlanId.join(",")
      : currentPlanId;
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][dispatch_id][_in]" : "filter[dispatch_id][_in]"] = ids;
  } else {
    if (search) params["filter[_and][0][dispatch_no][_icontains]"] = search;
    params[search ? "filter[_and][1][status][_eq]" : "filter[status][_eq]"] = "Picked";
  }

  const plansRes = await fetchItems<RawDispatchPlan>(
    "/items/dispatch_plan",
    params,
  );
  const plans = plansRes.data || [];

  if (!plans.length) return { data: [] };

  const planIds = plans.map((p) => p.dispatch_id);

  const [clustersRes, detailsRes] = await Promise.all([
    fetchItems<ClusterRow>("/items/cluster", {
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

  // 1. Fetch Sales Orders first to check status
  const orderStatusMap = new Map<number, string>();
  
  if (soIds.length > 0) {
    const ordersRes = await fetchItems<RawSalesOrder>("/items/sales_order", {
      "filter[order_id][_in]": soIds.join(","),
      fields: "order_id,order_no,order_status",
      limit: -1,
    });
    const orders = ordersRes.data || [];
    orders.forEach(o => {
      if (o.order_id) orderStatusMap.set(Number(o.order_id), o.order_status || "");
    });
  }

  // 2. --- WEIGHT CALCULATION START ---
  const planWeightMap = new Map<number, number>();
  if (soIds.length > 0) {
    const { data: soDetails } = await fetchItemsInChunks<{
      order_id: number;
      product_id: number;
      ordered_quantity: number | string;
      allocated_quantity: number | string;
    }>("/items/sales_order_details", "order_id", soIds, {
      fields: "order_id,product_id,ordered_quantity,allocated_quantity",
      limit: -1,
    });

    const productIds = [...new Set(soDetails.map((d) => Number(d.product_id)).filter(Boolean))];
    const prodWeightMap = new Map<number, number>();

    if (productIds.length > 0) {
      const { data: products } = await fetchItemsInChunks<{
        product_id: number;
        weight: string | number;
      }>("/items/products", "product_id", productIds, {
        fields: "product_id,weight",
        limit: -1,
      });
      products.forEach((p) =>
        prodWeightMap.set(Number(p.product_id), Number(p.weight || 0)),
      );
    }

    const soWeightMap = new Map<number, number>();

    soDetails.forEach((sd) => {
      const soId = Number(sd.order_id);

      const weight = prodWeightMap.get(Number(sd.product_id)) || 0;
      const qty = Number(sd.allocated_quantity || sd.ordered_quantity || 0);
      soWeightMap.set(soId, (soWeightMap.get(soId) || 0) + weight * qty);
    });

    details.forEach((d) => {
      const pId = Number(d.dispatch_id);
      const soWeight = soWeightMap.get(Number(d.sales_order_id)) || 0;
      planWeightMap.set(pId, (planWeightMap.get(pId) || 0) + soWeight);
    });
  }
  // --- WEIGHT CALCULATION END ---

  // 3. --- CONSOLIDATION CHECK START ---
  const planNos = plans.map((p) => p.dispatch_no);
  const consolidationReasonMap = new Map<number, "Unconsolidated" | "Partial Picking" | null>();

  if (planNos.length > 0) {
    const consolidatorDispatchesRes = await fetchItems<ConsolidatorDispatchRow>(
      "/items/consolidator_dispatches",
      {
        "filter[dispatch_no][_in]": planNos.join(","),
        fields: "consolidator_id,dispatch_no",
        limit: -1,
      },
    );
    const consolidatorDispatches = consolidatorDispatchesRes.data || [];
    const consolidatorIds = [
      ...new Set(consolidatorDispatches.map((cd) => cd.consolidator_id)),
    ];

    const consolidationPickingMap = new Map<number, boolean>(); // true = complete, false = partial

    if (consolidatorIds.length > 0) {
      const { data: consolidationDetails } = await fetchItemsInChunks<ConsolidatorDetailRow>(
        "/items/consolidator_details",
        "consolidator_id",
        consolidatorIds,
        { fields: "consolidator_id,picked_quantity,applied_quantity", limit: -1 },
      );

      const consolidatorPickingStatus = new Map<number, boolean>();
      // Initialize all as true (complete)
      consolidatorIds.forEach((id) => consolidatorPickingStatus.set(id, true));

      consolidationDetails.forEach((cd) => {
        const cId = cd.consolidator_id;
        if (Number(cd.picked_quantity) !== Number(cd.applied_quantity)) {
          consolidatorPickingStatus.set(cId, false);
        }
      });

      consolidatorPickingStatus.forEach((isComplete, cId) => {
        consolidationPickingMap.set(cId, isComplete);
      });
    }

    // Map plan ID to its consolidation reason
    plans.forEach((p) => {
      const linkedConsolidators = consolidatorDispatches.filter(
        (cd) => cd.dispatch_no === p.dispatch_no,
      );

      if (linkedConsolidators.length === 0) {
        consolidationReasonMap.set(p.dispatch_id, "Unconsolidated");
      } else {
        const allComplete = linkedConsolidators.every(
          (cd) => consolidationPickingMap.get(cd.consolidator_id) === true,
        );
        consolidationReasonMap.set(
          p.dispatch_id,
          allComplete ? null : "Partial Picking",
        );
      }
    });
  }
  // --- CONSOLIDATION CHECK END ---

  const clusterMap = new Map(
    (clustersRes.data || []).map((c) => [c.id, c.cluster_name]),
  );

  const detailCountMap = new Map<number, number>();
  const planStatusReadyMap = new Map<number, boolean>(); // Track if status is valid

  details.forEach((d) => {
    const dPlanId = d.dispatch_id;
    if (!dPlanId) return;

    // Count ALL items
    detailCountMap.set(dPlanId, (detailCountMap.get(dPlanId) || 0) + 1);

    // Check status readiness
    const soId = Number(d.sales_order_id);
    const orderStatus = orderStatusMap.get(soId);
    const isSoStatusReady = orderStatus ? READY_STATUSES.includes(orderStatus) : false;
    
    if (!planStatusReadyMap.has(dPlanId)) {
      planStatusReadyMap.set(dPlanId, true);
    }
    if (!isSoStatusReady) {
      planStatusReadyMap.set(dPlanId, false);
    }
  });

  const enrichedData = plans.map((p) => {
    const total_items = detailCountMap.get(p.dispatch_id) || 0;
    const isStatusReady = planStatusReadyMap.get(p.dispatch_id) ?? false;
    const consolidationReason = consolidationReasonMap.get(p.dispatch_id);

    let readiness_reason: EnrichedApprovedPlan["readiness_reason"] = null;
    if (!isStatusReady) readiness_reason = "Invalid Status";
    else if (consolidationReason) readiness_reason = consolidationReason;

    return {
      ...p,
      cluster_name: clusterMap.get(p.cluster_id || -1) || "Unassigned",
      total_items,
      total_weight: planWeightMap.get(p.dispatch_id) || 0,
      is_selectable: total_items > 0 && readiness_reason === null,
      readiness_reason,
    };
  });

  return { data: enrichedData };
}
