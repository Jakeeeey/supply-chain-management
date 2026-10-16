export type DashboardCardType = "vehicles" | "drivers" | "jo_pendings" | "outside";

export interface DashboardSummary {
  totalVehicles: number;
  totalDrivers: number;
  joPendings: number;
  vehiclesOutside: number;
}

export interface DashboardVehicleItem {
  id: number;
  plate_number: string;
  name: string;
  status: string;
  brand?: string;
  model?: string;
  fuel_type?: string;
  capacity?: string | number;
}

export interface DashboardDriverItem {
  id: number;
  user_id: number;
  name: string;
  email?: string;
  contact?: string;
  branch_name?: string;
  license_no?: string;
}

export interface DashboardJobOrderItem {
  id: number;
  jo_no: string;
  vehicle_plate?: string;
  vehicle_name?: string;
  jo_type: string;
  priority: string;
  status: string;
  target_start_date?: string;
  target_end_date?: string;
  total_parts_cost?: number;
}

export interface DashboardOutsideVehicleItem {
  id: string | number;
  doc_no: string;
  vehicle_id?: number | string;
  vehicle_plate: string;
  driver_name: string;
  status: string;
  dispatch_time?: string;
  estimated_arrival?: string;
  remarks?: string;
}

export interface FleetDashboardResponse {
  summary: DashboardSummary;
  lists: {
    vehicles: DashboardVehicleItem[];
    drivers: DashboardDriverItem[];
    jo_pendings: DashboardJobOrderItem[];
    outside: DashboardOutsideVehicleItem[];
  };
}
