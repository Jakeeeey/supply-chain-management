import { EngineTypeApiRow, EngineTypeFormValues } from "../types";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/logistics/vehicle-management/engine-type";

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

export async function listEngineTypes(
  page = 1,
  limit = 12,
  search = "",
): Promise<{ data: EngineTypeApiRow[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );

  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusListResponse<EngineTypeApiRow>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createEngineType(
  payload: EngineTypeFormValues,
): Promise<EngineTypeApiRow> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<EngineTypeApiRow>;
  return json?.data;
}

export async function updateEngineType(
  id: number,
  payload: EngineTypeFormValues,
): Promise<EngineTypeApiRow> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<EngineTypeApiRow>;
  return json?.data;
}
