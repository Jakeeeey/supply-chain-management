import { BrandApiRow, BrandFormValues } from "../types";

// Update response type to include Meta
type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/product-management/brand";

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

// ✅ Accept 'search' param (default empty)
export async function listBrands(
  page = 1,
  limit = 12,
  search = "",
): Promise<{ data: BrandApiRow[]; total: number }> {
  // Pass search to API route
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );

  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusListResponse<BrandApiRow>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createBrand(
  payload: BrandFormValues,
): Promise<BrandApiRow> {
  const cleanPayload = { ...payload };
  if ("brand_id" in cleanPayload) delete (cleanPayload as Record<string, unknown>).brand_id;

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<BrandApiRow>;
  return json?.data;
}

export async function updateBrand(
  id: string,
  payload: BrandFormValues,
): Promise<BrandApiRow> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<BrandApiRow>;
  return json?.data;
}
