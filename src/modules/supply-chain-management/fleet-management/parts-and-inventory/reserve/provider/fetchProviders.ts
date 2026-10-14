import type {
  IssuePartsInput,
  JobOrderPart,
  JobOrderPartsApiResponse,
  JobOrderRef,
  JobOrdersApiResponse,
} from "../types";
import type { VehiclePart } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
import { fetchVehicleParts } from "../../registration/provider/fetchProviders";
import { fetchBranches } from "../../stock-in/provider/fetchProviders";

const BASE_URL = "/api/scm/fleet-management/parts-and-inventory/reserve";
const JO_URL = "/api/scm/fleet-management/vehicle-management/vehicle-list/job-orders";

export async function fetchJobOrders(): Promise<JobOrderRef[]> {
  try {
    const res = await fetch(`${JO_URL}?limit=-1`, { cache: "no-store" });
    if (!res.ok) return [];
    const json: JobOrdersApiResponse = await res.json().catch(() => ({ data: [] }));
    return json.data || [];
  } catch {
    return [];
  }
}

export async function fetchIssuedPartsHistory(jobOrderId?: number): Promise<JobOrderPart[]> {
  const params = new URLSearchParams();
  if (jobOrderId) params.set("job_order_id", String(jobOrderId));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}${query}`, { cache: "no-store" });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch issued parts");
  }

  const result: JobOrderPartsApiResponse = await res.json();
  return result.data || [];
}

export async function issuePartsToJobOrder(input: IssuePartsInput): Promise<boolean> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to issue parts to job order");
  }

  return true;
}

export { fetchVehicleParts, fetchBranches };
