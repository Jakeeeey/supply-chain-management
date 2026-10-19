import type {
  VehicleJobOrder,
  VehicleOption,
  UserOption,
  VehiclePartOption,
  CreateJORequestPayload,
  ApproveAssignPayload,
  IssuePartsPayload,
  CompleteJOPayload,
} from "../types";

const BASE_URL = "/api/scm/fleet-management/vehicle-management/maintenance";

export interface MaintenanceOptionsResponse {
  vehicles: VehicleOption[];
  users: UserOption[];
  parts: VehiclePartOption[];
}

export async function fetchMaintenanceOptions(): Promise<MaintenanceOptionsResponse> {
  const res = await fetch(`${BASE_URL}?mode=options`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load options");
  }
  const json = await res.json();
  return json.data || { vehicles: [], users: [], parts: [] };
}

export async function fetchJobOrders(): Promise<VehicleJobOrder[]> {
  const res = await fetch(BASE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load Job Orders");
  }
  const json = await res.json();
  return json.data || [];
}

export async function createJobOrderRequest(payload: CreateJORequestPayload): Promise<VehicleJobOrder> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_request", ...payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to submit JO Request");
  }
  return json.data;
}

export async function approveOrRejectJobOrder(payload: ApproveAssignPayload): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve_assign", ...payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to process approval");
  }
}

export async function startMaintenance(jobOrderId: number): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start_maintenance", job_order_id: jobOrderId }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to start maintenance");
  }
}

export async function issueJobOrderParts(payload: IssuePartsPayload): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "issue_parts", ...payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to issue parts");
  }
}

export async function completeJobOrder(payload: CompleteJOPayload): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete_jo", ...payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to complete Job Order");
  }
}
