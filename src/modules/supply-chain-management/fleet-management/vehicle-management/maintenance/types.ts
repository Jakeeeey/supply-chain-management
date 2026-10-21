export type JOType = "Repair" | "Preventive Maintenance" | "Inspection";
export type JOPriority = "Low" | "Normal" | "High" | "Urgent";
export type JOStatus = "Requested" | "Approved" | "Rejected" | "In Progress" | "Completed" | "Cancelled";

export interface VehicleOption {
  vehicle_id: number;
  id?: number;
  vehicle_plate?: string;
  plate_number?: string;
  name?: string;
  make?: string;
  model?: string;
  year_model?: number;
  current_mileage?: number;
  odometer?: number;
  status?: string;
}

export interface UserOption {
  id?: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  user_fname?: string;
  user_mname?: string;
  user_lname?: string;
  email?: string;
  user_email?: string;
  position?: string;
  user_position?: string;
  role?: string;
}

export interface VehiclePartOption {
  id: number;
  part_code: string;
  part_name: string;
  category?: string;
  unit?: string;
  unit_cost: number;
  barcode?: string;
  on_hand?: number;
  reserved?: number;
}

export interface JobOrderPartItem {
  id?: number;
  job_order_id?: number;
  part_id: number;
  part_name?: string;
  part_code?: string;
  quantity_requested: number;
  quantity_issued?: number;
  unit_cost: number;
  issued_by?: number;
  issued_at?: string;
  remarks?: string;
}

export interface VehicleJobOrder {
  id: number;
  jo_no: string;
  vehicle_id: number | VehicleOption;
  branch_id?: number;
  jo_type: JOType;
  priority: JOPriority;
  description: string;
  odometer_reading?: number;
  status: JOStatus;
  requested_by?: number | UserOption;
  requested_at?: string;
  approved_by?: number | UserOption;
  approved_at?: string;
  decision_remarks?: string;
  mechanic_id?: number | UserOption;
  started_at?: string;
  completed_at?: string;
  completion_remarks?: string;
  labor_cost?: number;
  created_at?: string;
  updated_at?: string;
  parts?: JobOrderPartItem[];
}

export interface CreateJORequestPayload {
  vehicle_id: number;
  branch_id?: number;
  jo_type: JOType;
  priority: JOPriority;
  description: string;
  odometer_reading?: number;
  requested_by?: number;
  parts?: Array<{
    part_id: number;
    quantity_requested: number;
    unit_cost: number;
    remarks?: string;
  }>;
}

export interface ApproveAssignPayload {
  job_order_id: number;
  decision: "Approved" | "Rejected";
  mechanic_id?: number;
  approved_by?: number;
  decision_remarks?: string;
}

export interface IssuePartsPayload {
  job_order_id: number;
  branch_id: number;
  issued_by?: number;
  items: Array<{
    part_id: number;
    quantity: number;
    unit_cost: number;
    remarks?: string;
  }>;
}

export interface CompleteJOPayload {
  job_order_id: number;
  completion_remarks: string;
  labor_cost?: number;
  final_odometer?: number;
}
