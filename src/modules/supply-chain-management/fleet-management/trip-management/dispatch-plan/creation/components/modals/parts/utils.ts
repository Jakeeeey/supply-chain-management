import { PlanDetailItem, GroupedPlanDetailItem } from "./types";

/**
 * Groups individual route items by customer and city.
 * Manual and PO stops remain as individual groups.
 */
export function groupPlanDetails(items: PlanDetailItem[]): GroupedPlanDetailItem[] {
  const grouped: GroupedPlanDetailItem[] = [];
  const keyToGroup = new Map<string, GroupedPlanDetailItem>();

  items.forEach((item) => {
    let key: string;
    if (item.isManualStop || item.isPoStop) {
      key = String(item.detail_id);
    } else {
      key = `${item.customer_name}-${item.city}`;
    }

    const existing = keyToGroup.get(key);
    if (existing && !item.isManualStop && !item.isPoStop) {
      existing.items.push(item);
      existing.totalAmount += item.amount;
    } else {
      const newGroup: GroupedPlanDetailItem = {
        id: key,
        items: [item],
        customer_name: item.customer_name,
        city: item.city,
        isManualStop: item.isManualStop,
        isPoStop: item.isPoStop,
        remarks: item.remarks,
        distance: item.distance,
        po_no: item.po_no,
        totalAmount: item.amount,
        status: item.isManualStop || item.isPoStop ? (item.status || "Not Fulfilled") : item.order_status,
      };
      grouped.push(newGroup);
      if (!item.isManualStop && !item.isPoStop) {
        keyToGroup.set(key, newGroup);
      }
    }
  });

  return grouped;
}

/**
 * Computes the number of days between ETOD and ETOA.
 */
export function computeDeliveryDays(etod: string, etoa: string): number {
  if (!etod || !etoa) return 1.0; // Default fallback
  try {
    const start = new Date(etod);
    const end = new Date(etoa);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1.0;
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    // Return max of 0 and allow fractional days
    return Math.max(0, diffDays);
  } catch {
    return 1.0;
  }
}
