// src/modules/vehicle-management/vehicle-list/providers/fetchProviders.ts
import type { VehicleTypeApiRow, VehiclesApiRow } from "../types";

type DirectusListResponse<T> = { data: T[] };
type DirectusItemResponse<T> = { data: T };

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

async function readError(res: Response) {
  try {
    if (isJsonResponse(res)) {
      const j = await res.json();
      return j?.errors?.[0]?.message || j?.error || JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function listVehicleTypes(): Promise<VehicleTypeApiRow[]> {
  const res = await fetch("/api/vehicle-management/vehicle-list/vehicle-type");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehicleTypeApiRow>;
  return json?.data ?? [];
}

export async function listVehicles(): Promise<VehiclesApiRow[]> {
  const res = await fetch("/api/vehicle-management/vehicle-list");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehiclesApiRow>;
  return json?.data ?? [];
}

export async function createVehicle(payload: Record<string, any>) {
  const first = await fetch("/api/vehicle-management/vehicle-list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (first.ok) {
    const json = (await first.json()) as DirectusItemResponse<VehiclesApiRow>;
    return json?.data;
  }

  // retry minimal known keys if invalid-field errors
  const msg = await readError(first);
  const m = msg.toLowerCase();
  const looksLikeInvalidFields =
    m.includes("field") || m.includes("invalid") || m.includes("payload");

  if (!looksLikeInvalidFields) throw new Error(msg);

  const minimal = {
    vehicle_plate: payload.vehicle_plate,
    vehicle_type: payload.vehicle_type,
    status: payload.status,
  };

  const second = await fetch("/api/vehicle-management/vehicle-list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(minimal),
  });

  if (!second.ok) throw new Error(await readError(second));
  const json2 = (await second.json()) as DirectusItemResponse<VehiclesApiRow>;
  return json2?.data;
}
