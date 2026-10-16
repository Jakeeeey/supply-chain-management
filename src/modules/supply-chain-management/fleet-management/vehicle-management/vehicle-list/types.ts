// src/modules/vehicle-management/vehicle-list/types.ts

export type VehicleTypeApiRow = {
  id: number;
  type_name: string;
};

export type FuelTypeApiRow = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EngineTypeApiRow = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type VehiclesApiRow = {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_type: number | null;
  rfid_code?: string | null;
  status: string | null;

  // ✅ 5 new columns
  make?: string | null;
  model?: string | null;
  year_model?: number | null;
  vin_no?: string | null;
  engine_no?: string | null;

  // operational / specifications
  name?: string | null;
  purchased_date?: string | null;
  current_mileage?: number | null;
  fuel_type?: number | null;
  engine_type?: number | null;
  year_to_last?: number | null;
  image?: string | null;
  custodian_id?: number | null;

  // legacy fields for compatibility
  vehicle_name?: string | null;
  vehicle_model?: string | null;
  mileage_km?: number | string | null;
  mileage?: number | string | null;
  odometer?: number | string | null;

  // optional specs
  branch_id?: number | null;
  cbm_length?: string | number | null;
  cbm_width?: string | number | null;
  cbm_height?: string | number | null;
  max_liters?: string | number | null;
  maximum_weight?: string | number | null;
  minimum_load?: string | number | null;
  seats?: number | null;
  last_updated?: string | null;
};

// Document model
export type VehicleDocumentApiRow = {
  id: number;
  vehicle_id: number;
  document_type: "OR" | "CR" | "Insurance" | "Other" | string;
  document_no?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  file_id: string;
  file_name?: string | null;
  remarks?: string | null;
  is_deleted?: number | boolean | null;
  uploaded_by?: number | null;
  uploaded_at?: string | null;
  updated_at?: string | null;
};

// Parts catalogue
export type VehiclePartApiRow = {
  id: number;
  part_code: string;
  part_name: string;
  category?: string | null;
  unit?: string | null;
  description?: string | null;
  reorder_point?: number | null;
  unit_cost?: number | string | null;
  is_active?: boolean | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_by?: number | null;
  updated_at?: string | null;
};

export type BranchApiRow = {
  id: number;
  branch_name: string;
  branch_code?: string | null;
  location?: string | null;
  status?: string | null;
};

// Installed parts on vehicle
export type VehicleInstalledPartApiRow = {
  id: number;
  vehicle_id: number;
  part_id: number | VehiclePartApiRow;
  quantity: number;
  branch_id?: number | BranchApiRow | null;
  serial_no?: string | null;
  installed_at?: string | null;
  job_order_id?: number | null;
  removed_at?: string | null;
  remarks?: string | null;
  created_by?: number | null;
  created_at?: string | null;
};

// Job order model
export type VehicleJobOrderApiRow = {
  id: number;
  jo_no: string;
  vehicle_id: number;
  branch_id?: number | null;
  jo_type: "Repair" | "Preventive Maintenance" | "Inspection" | string;
  priority: "Low" | "Normal" | "High" | "Urgent" | string;
  description?: string | null;
  odometer_reading?: number | null;
  status: "Requested" | "Approved" | "Rejected" | "In Progress" | "Completed" | "Cancelled" | string;
  requested_by?: number | null;
  requested_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  decision_remarks?: string | null;
  mechanic_id?: number | UserApiRow | null;
  started_at?: string | null;
  completed_at?: string | null;
  completion_remarks?: string | null;
  labor_cost?: number | string | null;
  created_at?: string | null;
  updated_by?: number | null;
  updated_at?: string | null;
};

export type DispatchPlanApiRow = {
  id: number;
  doc_no?: string | null;

  vehicle_id: number | null;
  driver_id: number | null;

  status?: string | null;
  date_encoded?: string | null;

  estimated_time_of_dispatch?: string | null;
  estimated_time_of_arrival?: string | null;
  time_of_dispatch?: string | null;
  time_of_arrival?: string | null;

  total_distance?: number | null;

  starting_point?: string | number | null;
  destination_point?: string | number | null;
  ending_point?: string | number | null;
  origin?: string | null;
  destination?: string | null;
  route?: string | null;

  remarks?: string | null;
};

export type UserApiRow = {
  user_id: number;
  user_fname?: string | null;
  user_lname?: string | null;
  user_email?: string | null;
  role?: string | null;
  user_image?: string | null;
};

export type VehicleRow = {
  id: number;
  plateNo: string;

  // display name
  vehicleName: string;

  make?: string | null;
  model?: string | null;
  yearModel?: number | null;
  vinNo?: string | null;
  engineNo?: string | null;

  driverName: string;
  status: string;

  vehicleTypeId: number | null;
  vehicleTypeName: string | null;

  fuelTypeId?: number | null;
  fuelTypeName?: string | null;

  engineTypeId?: number | null;
  engineTypeName?: string | null;

  currentMileage?: number | null;
  image?: string | null;

  raw: VehiclesApiRow;
};

export type DocumentUploadItem = {
  id?: string;
  file?: File | null;
  documentType: "OR" | "CR" | "Insurance" | "Other";
  documentNo?: string;
  issuedDate?: string;
  expiryDate?: string;
  remarks?: string;
};

export type CreateVehicleForm = {
  plateNumber: string;
  vehicleName: string;

  // 5 new columns
  make: string;
  model: string;
  yearModel: string;
  vinNo: string;
  engineNo: string;

  year: string;
  typeId: number | null;

  status?: string;

  mileageKm?: string;
  fuelTypeId?: number | null;
  engineTypeId?: number | null;

  rfid: string;

  // specs
  seats?: string;
  maximumWeight?: string;
  minimumLoad?: string;
  maxLiters?: string;
  purchasedDate?: string;
  cbmLength?: string;
  cbmWidth?: string;
  cbmHeight?: string;

  // file upload
  imageFile?: File | null;

  // Registration documents to upload upon saving
  documents?: DocumentUploadItem[];
};
