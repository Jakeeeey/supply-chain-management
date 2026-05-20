import { ProductSectionApiRow, ProductSectionFormValues } from "../types";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/product-management/product-section";

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

export async function listProductSections(
  page = 1,
  limit = 12,
  search = "",
): Promise<{ data: ProductSectionApiRow[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );

  if (!res.ok) throw new Error(await readError(res));

  const json = (await res.json()) as DirectusListResponse<ProductSectionApiRow>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createProductSection(
  payload: ProductSectionFormValues,
): Promise<ProductSectionApiRow> {
  const cleanPayload = { ...payload };

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<ProductSectionApiRow>;
  return json?.data;
}

export async function updateProductSection(
  id: number,
  payload: ProductSectionFormValues,
): Promise<ProductSectionApiRow> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<ProductSectionApiRow>;
  return json?.data;
}

export async function checkProductSectionUniqueness(
  field: "section_name",
  value: string,
  excludeId?: number
): Promise<boolean> {
  const filter: Record<string, { _eq: string } | { _neq: number }> = {
    [field]: { _eq: value },
  };

  if (excludeId) {
    filter.id = { _neq: excludeId };
  }

  const res = await fetch(`${API_BASE}?limit=1&filter=${encodeURIComponent(JSON.stringify(filter))}`);
  if (!res.ok) return true; // Fail safe

  const json = await res.json();
  return (json?.data?.length ?? 0) === 0;
}
