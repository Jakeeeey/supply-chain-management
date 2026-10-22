import type {
  VehicleJobOrder,
  UserOption,
  ApproveAssignPayload,
} from "../types";

const BASE_URL = "/api/scm/fleet-management/vehicle-management/maintenance-approval";

export async function fetchApprovalOptions(): Promise<{ users: UserOption[] }> {
  const res = await fetch(`${BASE_URL}?mode=options`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load options");
  }
  const json = await res.json();
  return json.data || { users: [] };
}

export async function fetchRequestedJobOrders(): Promise<VehicleJobOrder[]> {
  const res = await fetch(BASE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load Requested Job Orders");
  }
  const json = await res.json();
  return json.data || [];
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
