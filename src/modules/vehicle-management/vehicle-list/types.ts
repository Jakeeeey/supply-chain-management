export type VehicleTypeApiRow = {
  id: number;
  type_name: string;
};

export type VehiclesApiRow = {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_type: number | null;
  status: string | null;

  // optional fields if present in your Directus schema
  model?: string | null;
  year?: string | number | null;
  category?: string | null;
  mileage?: string | number | null;
  fuel_type?: string | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;

  // other optional fields (present in your API sample)
  branch_id?: number | null;
  cbm_length?: string | number | null;
  cbm_width?: string | number | null;
  max_liters?: string | number | null;
  maximum_weight?: string | number | null;
  minimum_load?: string | number | null;
  seats?: number | null;
  last_updated?: string | null;
};

export type UserApiRow = {
  user_id: number;
  user_fname?: string | null;
  user_lname?: string | null;
  user_email?: string | null;
  role?: string | null;
  user_image?: string | null;
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

  // optional route-related fields (may or may not exist in your schema)
  starting_point?: string | number | null;
  destination_point?: string | number | null;
  ending_point?: string | number | null;
  origin?: string | null;
  destination?: string | null;
  route?: string | null;

  remarks?: string | null;
};

export type VehicleRow = {
  id: number;
  plateNo: string;

  // UI fields
  vehicleName: string; // model/name
  driverName: string;
  status: string;

  // joins
  vehicleTypeId: number | null;
  vehicleTypeName: string | null;

  driverId: number | null;
  latestDispatchPlanId: number | null;

  // optional details
  year?: string | null;
  category?: string | null;
  mileageKm?: string | null;
  fuelType?: string | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;

  raw: VehiclesApiRow;
};

export type CreateVehicleForm = {
  plateNumber: string;
  model: string;
  year: string;
  typeId: number | null;

  category?: string;
  status?: string;

  mileageKm?: string;
  fuelType?: string;

  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
};
