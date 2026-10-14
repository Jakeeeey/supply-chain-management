import type { VehiclePart } from "../registration/types";
import type { Branch } from "../stock-in/types";

export interface PartStock {
  id: number;
  part_id: number | VehiclePart;
  branch_id: number | Branch;
  on_hand: number;
  reserved: number;
  updated_at?: string;
}

export type StockHealthStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface StockMonitoringItem {
  id: number; // vehicle_part_stock id or part_id if aggregated
  part_id: number;
  part_code: string;
  part_name: string;
  classification_name: string;
  barcode: string;
  barcode_type: "unique" | "inherited" | "none";
  unit: string;
  unit_cost: number;
  reorder_point: number;
  branch_id?: number | null;
  branch_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  valuation: number;
  status: StockHealthStatus;
  updated_at?: string;
}

export interface StockMonitoringKpis {
  totalSkus: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockApiResponse {
  data: PartStock[];
}
