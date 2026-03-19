/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnitApiRow, UnitFormValues } from "../types";

// ✅ Updated Response Type
type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/product-management/unit-of-measurement";

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

// ✅ Updated: Accepts page, limit, search
export async function listUnits(
  page = 1,
  limit = 12,
  search = "",
): Promise<{ data: UnitApiRow[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );
  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusListResponse<UnitApiRow>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createUnit(payload: UnitFormValues): Promise<UnitApiRow> {
  const cleanPayload = { ...payload };
  if ("unit_id" in cleanPayload) delete (cleanPayload as Record<string, unknown>).unit_id;

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<UnitApiRow>;
  return json?.data;
}

export async function updateUnit(
  id: string,
  payload: UnitFormValues,
): Promise<UnitApiRow> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<UnitApiRow>;
  return json?.data;
}
