import type {
  VehicleJobOrder,
  VehiclePartOption,
  IssuePartsPayload,
  CompleteJOPayload,
} from "../types";

const BASE_URL = "/api/scm/fleet-management/vehicle-management/maintenance-progress";

export async function fetchProgressOptions(branchId?: number | string): Promise<{ parts: VehiclePartOption[] }> {
  const query = branchId ? `?mode=options&branch_id=${encodeURIComponent(branchId)}` : `?mode=options`;
  const res = await fetch(`${BASE_URL}${query}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load options");
  }
  const json = await res.json();
  return json.data || { parts: [] };
}

export async function fetchInProgressJobOrders(): Promise<VehicleJobOrder[]> {
  const res = await fetch(BASE_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load In Progress Job Orders");
  }
  const json = await res.json();
  return json.data || [];
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
