import { FuelTypeApiRow, FuelTypeFormValues } from "../types";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/logistics/vehicle-management/fuel-type";

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

export async function listFuelTypes(
  page = 1,
  limit = 12,
  search = "",
): Promise<{ data: FuelTypeApiRow[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );

  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusListResponse<FuelTypeApiRow>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createFuelType(
  payload: FuelTypeFormValues,
): Promise<FuelTypeApiRow> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<FuelTypeApiRow>;
  return json?.data;
}

export async function updateFuelType(
  id: number,
  payload: FuelTypeFormValues,
): Promise<FuelTypeApiRow> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<FuelTypeApiRow>;
  return json?.data;
}
