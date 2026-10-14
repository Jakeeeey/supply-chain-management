import type { OutboundMovement, StockOutPayload } from "../types";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import type { StockItem } from "../../stock-monitoring/types";

export async function fetchOutboundMovements(params: {
  search?: string;
  branch_id?: string;
  movement_type?: string;
}): Promise<OutboundMovement[]> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.branch_id && params.branch_id !== "all") q.set("branch_id", params.branch_id);
  if (params.movement_type && params.movement_type !== "all") q.set("movement_type", params.movement_type);

  const res = await fetch(`/api/scm/fleet-management/parts-and-inventory/stock-out?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "Failed to fetch outbound movements");
  }
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/branches", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchAvailableStock(branchId: number): Promise<StockItem[]> {
  const res = await fetch(`/api/scm/fleet-management/parts-and-inventory/stock-monitoring?branch_id=${branchId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function submitStockOut(payload: StockOutPayload): Promise<unknown> {
  const res = await fetch("/api/scm/fleet-management/parts-and-inventory/stock-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || "Failed to record stock out");
  }
  return res.json();
}
