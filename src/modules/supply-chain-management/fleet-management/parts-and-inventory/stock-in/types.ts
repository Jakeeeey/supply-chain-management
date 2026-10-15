import type { VehiclePart } from "../registration/types";

export interface Branch {
  id: number;
  branch_name: string;
  branch_code?: string;
  city?: string;
}

export interface StockMovement {
  id: number;
  part_id: number | VehiclePart;
  branch_id?: number | Branch | null;
  movement_type: "Stock In" | "Reserve" | "Issue" | "Return" | "Adjustment";
  quantity: number;
  unit_cost: number;
  job_order_id?: number | null;
  vehicle_id?: number | null;
  reference_no: string;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface StockInItemPayload {
  part_id: number;
  quantity: number;
  unit_cost: number;
  remarks?: string;
}

export interface BatchStockInInput {
  reference_no: string;
  branch_id: number;
  remarks?: string;
  items: StockInItemPayload[];
}

export interface StockMovementsApiResponse {
  data: StockMovement[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}
