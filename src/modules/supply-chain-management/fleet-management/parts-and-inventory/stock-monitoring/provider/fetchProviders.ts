import type { PartStock, StockApiResponse } from "../types";
import { fetchVehicleParts, fetchClassifications } from "../../registration/provider/fetchProviders";
import { fetchBranches } from "../../stock-in/provider/fetchProviders";

const BASE_URL = "/api/scm/fleet-management/parts-and-inventory/stock-monitoring";

export async function fetchStockRecords(branchId?: string): Promise<PartStock[]> {
  const params = new URLSearchParams();
  if (branchId && branchId !== "all") params.set("branch_id", branchId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch stock records");
  }

  const result: StockApiResponse = await res.json();
  return result.data || [];
}

export { fetchVehicleParts, fetchClassifications, fetchBranches };
