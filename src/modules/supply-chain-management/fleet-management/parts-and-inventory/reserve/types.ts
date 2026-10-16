import type { VehiclePart } from "../registration/types";
import type { Branch } from "../stock-in/types";

export interface VehicleRef {
  vehicle_id?: number | string;
  id?: number | string;
  plate_number?: string;
  vehicle_name?: string;
  make?: string;
  model?: string;
}

export interface JobOrderRef {
  id: number;
  jo_no: string;
  vehicle_id: number | VehicleRef;
  branch_id: number | Branch;
  jo_type?: string;
  priority?: string;
  description?: string;
  status: string;
  requested_by?: string | number | null;
  mechanic_id?: string | number | null;
  started_at?: string | null;
  completed_at?: string | null;
  labor_cost?: number;
  created_at: string;
}

export interface JobOrderPart {
  id: number;
  job_order_id: number | JobOrderRef;
  part_id: number | VehiclePart;
  quantity_requested: number;
  quantity_issued: number;
  unit_cost: number;
  issued_by?: string | null;
  issued_at?: string | null;
  remarks?: string | null;
}

export interface IssueItemPayload {
  part_id: number;
  quantity: number;
  unit_cost: number;
  remarks?: string;
}

export interface IssuePartsInput {
  job_order_id: number;
  branch_id: number;
  remarks?: string;
  items: IssueItemPayload[];
}

export interface JobOrdersApiResponse {
  data: JobOrderRef[];
}

export interface JobOrderPartsApiResponse {
  data: JobOrderPart[];
}
