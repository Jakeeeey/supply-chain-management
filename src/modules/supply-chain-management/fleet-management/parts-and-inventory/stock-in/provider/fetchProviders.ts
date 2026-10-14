import type { BatchStockInInput, Branch, StockMovement, StockMovementsApiResponse } from "../types";
import type { VehiclePart } from "../../registration/types";
import { fetchVehicleParts } from "../../registration/provider/fetchProviders";

const BASE_URL = "/api/scm/fleet-management/parts-and-inventory/stock-in";
const BRANCHES_URL = "/api/scm/fleet-management/parts-and-inventory/branches";

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const res = await fetch(BRANCHES_URL, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => ({ data: [] }));
    return json.data || [];
  } catch {
    return [];
  }
}

export async function fetchStockInMovements(params?: {
  search?: string;
  branch_id?: string;
}): Promise<StockMovement[]> {
  const qp = new URLSearchParams();
  if (params?.search) qp.set("search", params.search);
  if (params?.branch_id && params.branch_id !== "all") qp.set("branch_id", params.branch_id);

  const query = qp.toString() ? `?${qp.toString()}` : "";
  const res = await fetch(`${BASE_URL}${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Failed to fetch stock-in movements");
  }

  const result: StockMovementsApiResponse = await res.json();
  return result.data || [];
}

export async function createBatchStockIn(input: BatchStockInInput): Promise<boolean> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData.details?.errors?.[0]?.message ||
      errorData.error ||
      errorData.details ||
      "Failed to record stock in";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return true;
}

export { fetchVehicleParts };
