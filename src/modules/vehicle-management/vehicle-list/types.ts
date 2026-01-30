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
  status: string | null;

  // ✅ new columns based on your DB reference/API
  name?: string | null;
  purchased_date?: string | null;
  current_mileage?: number | null;
  fuel_type?: number | null;
  engine_type?: number | null;
  year_to_last?: number | null;
  image?: string | null;
  custodian_id?: number | null;

  // existing optional fields
  branch_id?: number | null;
  cbm_length?: string | number | null;
  cbm_width?: string | number | null;
  max_liters?: string | number | null;
  maximum_weight?: string | number | null;
  minimum_load?: string | number | null;
  seats?: number | null;
  last_updated?: string | null;
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

  // ✅ display name now prioritizes vehicles.name
  vehicleName: string;

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

export type CreateVehicleForm = {
  plateNumber: string;

  // ✅ renamed from model -> vehicleName
  vehicleName: string;

  year: string;
  typeId: number | null;

  status?: string;

  mileageKm?: string;
  fuelTypeId?: number | null;
  engineTypeId?: number | null;

  // keep your date inputs (UI), but we won’t send unless you confirm field names
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;

  // ✅ file upload
  imageFile?: File | null;
};
