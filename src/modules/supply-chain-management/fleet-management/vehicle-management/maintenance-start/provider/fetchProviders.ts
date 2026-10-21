import type {
  VehicleJobOrder,
  VehiclePartOption,
  IssuePartsPayload,
} from "../types";

const BASE_URL = "/api/scm/fleet-management/vehicle-management/maintenance-start";

export async function fetchStartOptions(): Promise<{ parts: VehiclePartOption[] }> {
  const res = await fetch(`${BASE_URL}?mode=options`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load options");
  }
  const json = await res.json();
  return json.data || { parts: [] };
}

export async function fetchApprovedJobOrders(): Promise<VehicleJobOrder[]> {
  const res = await fetch(BASE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load Approved Job Orders");
  }
  const json = await res.json();
  return json.data || [];
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
