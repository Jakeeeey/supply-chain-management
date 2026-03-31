import type {
  VehicleTypeApiRow,
  VehiclesApiRow,
  DispatchPlanApiRow,
  UserApiRow,
  FuelTypeApiRow,
  EngineTypeApiRow,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";

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
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/vehicle-type");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehicleTypeApiRow>;
  return json?.data ?? [];
}

export async function listFuelTypes(): Promise<FuelTypeApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/fuel-type?limit=-1");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<FuelTypeApiRow>;
  return json?.data ?? [];
}

export async function listEngineTypes(): Promise<EngineTypeApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/engine-type?limit=-1");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<EngineTypeApiRow>;
  return json?.data ?? [];
}

export async function listVehicles(): Promise<VehiclesApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehiclesApiRow>;
  return json?.data ?? [];
}

export async function listUsers(): Promise<UserApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/users?limit=-1");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<UserApiRow>;
  return json?.data ?? [];
}

export async function listDispatchPlans(): Promise<DispatchPlanApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/dispatch-plans?limit=-1");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<DispatchPlanApiRow>;
  return json?.data ?? [];
}

export async function listDispatchPlansByVehicle(vehicleId: number): Promise<DispatchPlanApiRow[]> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/dispatch-plans?limit=-1&vehicle_id=${encodeURIComponent(
      String(vehicleId)
    )}`
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<DispatchPlanApiRow>;
  return json?.data ?? [];
}

/**
 * ✅ Upload to Next.js server filesystem under /public/uploads/vehicles
 * Returns a PUBLIC PATH like: /uploads/vehicles/xxx.jpg
 * (This is what we store in vehicles.image)
 */
export async function uploadVehicleImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/upload", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusItemResponse<{ path: string }>;
  const p = String((json as any)?.data?.path ?? "").trim();
  if (!p) throw new Error("Upload succeeded but no path was returned.");
  return p;
}

const VEHICLE_ALLOWED_KEYS = new Set([
  "vehicle_plate",
  "vehicle_type",
  "status",
  "name",
  "purchased_date",
  "current_mileage",
  "fuel_type",
  "engine_type",
  "year_to_last",
  "image",
  "custodian_id",
  "rfid_code",
  "seats",
  "maximum_weight",
  "minimum_load",
  "max_liters",
  "cbm_length",
  "cbm_width",
  "cbm_height",
]);

function sanitizeVehicleCreatePayload(payload: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (!VEHICLE_ALLOWED_KEYS.has(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

export async function createVehicle(payload: Record<string, any>) {
  const first = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (first.ok) {
    const json = (await first.json()) as DirectusItemResponse<VehiclesApiRow>;
    return json?.data;
  }

  const msg = await readError(first);
  const m = msg.toLowerCase();
  const looksLikeInvalidFields =
    m.includes("field") || m.includes("invalid") || m.includes("payload");

  if (!looksLikeInvalidFields) throw new Error(msg);

  // ✅ retry with only known vehicle columns (prevents losing good fields)
  const sanitized = sanitizeVehicleCreatePayload(payload);

  const second = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sanitized),
  });

  if (!second.ok) throw new Error(await readError(second));
  const json2 = (await second.json()) as DirectusItemResponse<VehiclesApiRow>;
  return json2?.data;
}
