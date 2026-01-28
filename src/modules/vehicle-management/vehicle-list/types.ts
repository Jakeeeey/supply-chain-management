// src/modules/vehicle-management/vehicle-list/types.ts
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

export type VehicleRow = {
  id: number;
  plateNo: string;
  vehicleName: string; // we display type name here for now
  driverName: string;  // placeholder
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
