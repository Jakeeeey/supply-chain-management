import type { VehicleJobOrder, VehiclePartOption, IssuePartsPayload, CompleteJOPayload } from "../types";

const API_BASE = "/api/scm/fleet-management/vehicle-management/maintenance-progress";

export async function fetchInProgressJobOrders(): Promise<VehicleJobOrder[]> {
  const res = await fetch(`${API_BASE}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch in progress job orders");
  }
  const body = await res.json();
  return body.data || [];
}

export async function fetchProgressOptions(branchId?: number): Promise<{ parts: VehiclePartOption[] }> {
  const url = branchId ? `${API_BASE}?mode=options&branch_id=${branchId}` : `${API_BASE}?mode=options`;
  const res = await fetch(url, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch progress options");
  }
  const body = await res.json();
  return body.data || { parts: [] };
}

export async function issueJobOrderParts(payload: IssuePartsPayload): Promise<void> {
  const res = await fetch(`${API_BASE}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "issue_parts",
      ...payload,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to issue parts");
  }
}

export async function completeJobOrder(payload: CompleteJOPayload): Promise<void> {
  const res = await fetch(`${API_BASE}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "complete_jo",
      ...payload,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to complete job order");
  }
}
