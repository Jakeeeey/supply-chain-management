import type { EnrichedPlanDetail } from "../../../types/dispatch.types";

/**
 * Re-export EnrichedPlanDetail as PlanDetailItem for backward compatibility.
 * These types have been consolidated — EnrichedPlanDetail is the single source of truth.
 */
export type PlanDetailItem = EnrichedPlanDetail;

export interface GroupedPlanDetailItem {
  id: string; // Aggregation key
  items: PlanDetailItem[];
  customer_name?: string;
  city?: string;
  isManualStop?: boolean;
  isPoStop?: boolean;
  remarks?: string;
  distance?: number;
  po_no?: string;
  totalAmount: number;
  status?: string; // Summary status
}
