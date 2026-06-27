export type EmergencyIncidentType =
  | "breakdown"
  | "accident"
  | "medical"
  | "fire"
  | "cargo_issue"
  | "road_hazard"
  | "other";

export type EmergencySeverity = "low" | "medium" | "high" | "critical";

export type EmergencyStatus =
  | "reported"
  | "acknowledged"
  | "responding"
  | "resolved"
  | "cancelled";

export type EmergencyReport = {
  id: number;
  report_no: string;
  incident_type: EmergencyIncidentType;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  vehicle_id: number | null;
  driver_user_id: number | null;
  dispatch_plan_id: number | null;
  reported_by: number | null;
  assigned_to: number | null;
  occurred_at: string;
  reported_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  immediate_action_taken: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  cancelled_reason: string | null;
  attachments: string | null;
  created_at: string;
  updated_at: string | null;
  vehicle?: VehicleOption | null;
  driver?: DriverOption | null;
  dispatchPlan?: DispatchPlanOption | null;
};

export type VehicleOption = {
  vehicle_id: number;
  vehicle_plate: string;
  status?: string | null;
};

export type DriverOption = {
  user_id: number;
  name: string;
  user_contact?: string | null;
};

export type DispatchPlanOption = {
  id: number;
  doc_no: string;
  vehicle_id: number | null;
  driver_id: number | null;
  status?: string | null;
};

export type EmergencyLookups = {
  vehicles: VehicleOption[];
  drivers: DriverOption[];
  dispatchPlans: DispatchPlanOption[];
};

export type EmergencyReportPayload = {
  incident_type: EmergencyIncidentType;
  severity: EmergencySeverity;
  vehicle_id?: number | null;
  driver_user_id?: number | null;
  dispatch_plan_id?: number | null;
  occurred_at: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  immediate_action_taken?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
};

export type DriverProfileResponse = {
  isDriver: boolean;
  user: {
    user_id: number;
    user_fname?: string | null;
    user_mname?: string | null;
    user_lname?: string | null;
    user_contact?: string | null;
    user_email?: string | null;
    name: string;
  } | null;
  driver: {
    id: number;
    user_id: number;
    branch_id?: number | null;
    bad_branch_id?: number | null;
  } | null;
  activeTrip: {
    id: number;
    doc_no: string;
    status: string | null;
    vehicle_id: number | null;
    vehicle_plate: string | null;
  } | null;
};
