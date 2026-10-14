import type {
  VehicleTypeApiRow,
  VehiclesApiRow,
  DispatchPlanApiRow,
  UserApiRow,
  FuelTypeApiRow,
  EngineTypeApiRow,
  VehicleDocumentApiRow,
  VehiclePartApiRow,
  VehicleInstalledPartApiRow,
  VehicleJobOrderApiRow,
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
 * Upload vehicle photo
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
  const p = String(json?.data?.path ?? "").trim();
  if (!p) throw new Error("Upload succeeded but no path was returned.");
  return p;
}

/**
 * Upload vehicle registration document (OR, CR, Insurance, etc.)
 */
export async function uploadVehicleDocument(
  file: File,
  meta: {
    vehicleId?: number;
    documentType: string;
    documentNo?: string;
    issuedDate?: string;
    expiryDate?: string;
    remarks?: string;
  }
): Promise<{ file_id: string; file_name: string; document_id: number | null }> {
  const fd = new FormData();
  fd.append("file", file);
  if (meta.vehicleId) fd.append("vehicle_id", String(meta.vehicleId));
  fd.append("document_type", meta.documentType);
  if (meta.documentNo) fd.append("document_no", meta.documentNo);
  if (meta.issuedDate) fd.append("issued_date", meta.issuedDate);
  if (meta.expiryDate) fd.append("expiry_date", meta.expiryDate);
  if (meta.remarks) fd.append("remarks", meta.remarks);

  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/document-upload", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await readError(res));
  return await res.json();
}

/**
 * List documents for a vehicle
 */
export async function listVehicleDocuments(vehicleId: number): Promise<VehicleDocumentApiRow[]> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/documents?vehicle_id=${encodeURIComponent(
      String(vehicleId)
    )}`
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehicleDocumentApiRow>;
  return json?.data ?? [];
}

/**
 * Update document metadata (or replace file)
 */
export async function updateVehicleDocument(
  docId: number,
  payload: Record<string, unknown>
): Promise<VehicleDocumentApiRow> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/documents/${encodeURIComponent(String(docId))}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<VehicleDocumentApiRow>;
  return json?.data;
}

/**
 * Delete a document
 */
export async function deleteVehicleDocument(docId: number): Promise<void> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/documents/${encodeURIComponent(String(docId))}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) throw new Error(await readError(res));
}

/**
 * List parts catalogue
 */
export async function listVehicleParts(): Promise<VehiclePartApiRow[]> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/parts");
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehiclePartApiRow>;
  return json?.data ?? [];
}

/**
 * List installed parts for a vehicle
 */
export async function listVehicleInstalledParts(vehicleId: number): Promise<VehicleInstalledPartApiRow[]> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/installed-parts?vehicle_id=${encodeURIComponent(
      String(vehicleId)
    )}`
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehicleInstalledPartApiRow>;
  return json?.data ?? [];
}

/**
 * Install / link a part to a vehicle
 */
export async function installVehiclePart(payload: {
  vehicle_id: number;
  part_id: number;
  quantity: number;
  serial_no?: string;
  remarks?: string;
}): Promise<VehicleInstalledPartApiRow> {
  const res = await fetch("/api/scm/fleet-management/vehicle-management/vehicle-list/installed-parts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<VehicleInstalledPartApiRow>;
  return json?.data;
}

/**
 * List job orders for a vehicle
 */
export async function listVehicleJobOrders(vehicleId: number): Promise<VehicleJobOrderApiRow[]> {
  const res = await fetch(
    `/api/scm/fleet-management/vehicle-management/vehicle-list/job-orders?vehicle_id=${encodeURIComponent(
      String(vehicleId)
    )}`
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusListResponse<VehicleJobOrderApiRow>;
  return json?.data ?? [];
}

const VEHICLE_ALLOWED_KEYS = new Set([
  "vehicle_plate",
  "vehicle_type",
  "status",
  "name",
  "make",
  "model",
  "year_model",
  "vin_no",
  "engine_no",
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

function sanitizeVehicleCreatePayload(payload: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (!VEHICLE_ALLOWED_KEYS.has(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

export async function createVehicle(payload: Record<string, unknown>) {
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

  // retry with only known vehicle columns
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

export async function updateVehicle(id: number, payload: Record<string, unknown>) {
  const sanitized = sanitizeVehicleCreatePayload(payload);
  const res = await fetch(`/api/scm/fleet-management/vehicle-management/vehicle-list/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<VehiclesApiRow>;
  return json?.data;
}
