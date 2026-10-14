import type { VehiclePart } from "../registration/types";
import type { Branch } from "../stock-in/types";

export type OutboundMovementType = "Issue" | "Scrap" | "Damage" | "Disposal" | "Adjustment" | "Return";

export interface OutboundMovement {
  id: number;
  part_id: number | VehiclePart;
  branch_id?: number | Branch | null;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  job_order_id?: number | { id: number; jo_no?: string } | null;
  vehicle_id?: number | { id: number; plate_number?: string; vehicle_name?: string } | null;
  reference_no?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface StockOutPayload {
  branch_id: number;
  part_id: number;
  movement_type: "Scrap" | "Damage" | "Disposal" | "Adjustment" | "Return";
  quantity: number;
  unit_cost: number;
  reference_no?: string;
  remarks: string;
}

export interface StockOutApiResponse {
  data: OutboundMovement[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}
