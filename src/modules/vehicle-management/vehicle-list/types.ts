export type VehicleTypeApiRow = {
  id: number;
  type_name: string;
};

export type VehiclesApiRow = {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_type: number | null;
  status: string | null;

  // other optional fields (present in your API)
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

  // optional route-related fields (may or may not exist / be permitted)
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
  vehicleName: string; // we display type name here for now
  driverName: string; // placeholder for now (can be upgraded later)
  status: string;

  vehicleTypeId: number | null;
  vehicleTypeName: string | null;

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
