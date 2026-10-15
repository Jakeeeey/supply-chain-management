import type { PurchaseRequest, ReorderTriggerItem, CreatePurchaseRequestPayload } from "../types";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";

export async function fetchReorderTriggersAndPRs(branchId?: string): Promise<{
  prs: PurchaseRequest[];
  triggers: ReorderTriggerItem[];
}> {
  const q = new URLSearchParams();
  if (branchId && branchId !== "all") q.set("branch_id", branchId);

  const res = await fetch(`/api/scm/fleet-management/parts-and-inventory/purchase-order?${q.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "Failed to load purchase requests and triggers");
  }

  const json = await res.json();
  return {
    prs: Array.isArray(json?.data) ? json.data : [],
    triggers: Array.isArray(json?.triggers) ? json.triggers : [],
  };
}

export async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/branches", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchParts(): Promise<VehiclePart[]> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/registration", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function createPurchaseRequest(payload: CreatePurchaseRequestPayload): Promise<unknown> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/purchase-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "Failed to create purchase request");
  }

  return res.json();
}

export async function updatePurchaseRequestStatus(id: number, action: "approve" | "receive" | "cancel"): Promise<unknown> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/purchase-order", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || `Failed to ${action} purchase request`);
  }

  return res.json();
}

