import { RTSReturnType } from "../types";
import { RTSReturnTypeFormValues } from "../schema";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

import { readError } from "../lib/utils";

const MODULE_NAME = "RTSReturnType";
const API_BASE = "/api/scm/file-management/return-supplier-type";

export async function listRTSReturnTypes(
  page = 1,
  limit = 10,
  search = "",
): Promise<{ data: RTSReturnType[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );
  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));

  const json = (await res.json()) as DirectusListResponse<RTSReturnType>;

  return {
    data: json?.data ?? [],
    total: json?.meta?.filter_count ?? 0,
  };
}

export async function createRTSReturnType(
  payload: RTSReturnTypeFormValues,
): Promise<RTSReturnType> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));
  const json = (await res.json()) as DirectusItemResponse<RTSReturnType>;
  return json?.data;
}

export async function updateRTSReturnType(
  id: number,
  payload: RTSReturnTypeFormValues,
): Promise<RTSReturnType> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await readError(res, MODULE_NAME));
  const json = (await res.json()) as DirectusItemResponse<RTSReturnType>;
  return json?.data;
}
