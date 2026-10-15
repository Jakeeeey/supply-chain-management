import type {
  CreateClassificationInput,
  CreateVehiclePartInput,
  UpdateVehiclePartInput,
  VehiclePart,
  VehiclePartClassification,
  VehiclePartsApiResponse,
  ClassificationsApiResponse,
} from "../types";

const BASE_URL = "/api/scm/fleet-management/parts-and-inventory/registration";
const CLASSIFICATIONS_URL = "/api/scm/fleet-management/parts-and-inventory/registration/classifications";

export async function fetchVehicleParts(filters?: {
  search?: string;
  classification_id?: string;
  status?: string;
}): Promise<VehiclePart[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.classification_id && filters.classification_id !== "all") {
    params.set("classification_id", filters.classification_id);
  }
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch vehicle parts");
  }

  const result: VehiclePartsApiResponse = await res.json();
  return result.data || [];
}

export async function fetchClassifications(): Promise<VehiclePartClassification[]> {
  const res = await fetch(CLASSIFICATIONS_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch classifications");
  }

  const result: ClassificationsApiResponse = await res.json();
  return result.data || [];
}

export async function createClassification(
  input: CreateClassificationInput
): Promise<VehiclePartClassification> {
  const res = await fetch(CLASSIFICATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create classification");
  }

  const result = await res.json();
  return result.data;
}

export async function createVehiclePart(input: CreateVehiclePartInput): Promise<VehiclePart> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create vehicle part");
  }

  const result = await res.json();
  return result.data;
}

export async function updateVehiclePart(
  id: number,
  input: UpdateVehiclePartInput
): Promise<VehiclePart> {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...input }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update vehicle part");
  }

  const result = await res.json();
  return result.data;
}

export async function deleteVehiclePart(id: number): Promise<boolean> {
  const res = await fetch(`${BASE_URL}?id=${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete vehicle part");
  }

  return true;
}
