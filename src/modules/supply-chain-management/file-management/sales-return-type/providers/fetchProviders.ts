import { SalesReturnType } from "../types";
import { SalesReturnTypeFormValues } from "../schema";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

import { readError } from "../lib/utils";

const MODULE_NAME = "SalesReturnType";
const API_BASE = "/api/scm/file-management/sales-return-type";

export async function listSalesReturnTypes(
  page = 1,
  limit = 10,
  search = "",
): Promise<{ data: SalesReturnType[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );
  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));

  const json = (await res.json()) as DirectusListResponse<SalesReturnType>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createSalesReturnType(
  payload: SalesReturnTypeFormValues,
): Promise<SalesReturnType> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));
  const json = (await res.json()) as DirectusItemResponse<SalesReturnType>;
  return json?.data;
}

export async function updateSalesReturnType(
  id: number,
  payload: SalesReturnTypeFormValues,
): Promise<SalesReturnType> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));
  const json = (await res.json()) as DirectusItemResponse<SalesReturnType>;
  return json?.data;
}
