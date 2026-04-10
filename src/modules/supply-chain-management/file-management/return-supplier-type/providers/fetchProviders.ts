import { RTSReturnType } from "../types";
import { RTSReturnTypeFormValues } from "../schema";

type DirectusListResponse<T> = {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
};
type DirectusItemResponse<T> = { data: T };

const API_BASE = "/api/scm/file-management/return-supplier-type";

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

async function readError(res: Response) {
  try {
    if (isJsonResponse(res)) {
      const j = await res.json();
      console.error("[RTSReturnType API Error]", j);
      
      // Standard Directus error format: { errors: [{ message: ... }] }
      if (Array.isArray(j?.errors) && j.errors.length > 0) {
        return j.errors[0]?.message || "A database error occurred.";
      }
      
      // Other JSON formats: { error: ... } or { message: ... }
      if (j?.error) return j.error;
      if (j?.message) return j.message;
      
      // Stringify if no obvious message field
      return JSON.stringify(j);
    }
    
    // Non-JSON errors (like Gateway Timeouts or Nginx errors)
    const text = await res.text();
    console.error("[RTSReturnType API Error Text]", text);
    return text || `HTTP ${res.status}: ${res.statusText}`;
  } catch (error) {
    console.error("[RTSReturnType readError Failed]", error);
    return `Server communication failed (${res.status})`;
  }
}

export async function listRTSReturnTypes(
  page = 1,
  limit = 10,
  search = "",
): Promise<{ data: RTSReturnType[]; total: number }> {
  const res = await fetch(
    `${API_BASE}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
  );
  if (!res.ok) throw new Error(await readError(res));

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

  if (!res.ok) throw new Error(await readError(res));
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

  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as DirectusItemResponse<RTSReturnType>;
  return json?.data;
}
