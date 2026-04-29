/**
 * Low-level HTTP client for the Stock Transfer module.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  ...(STATIC_TOKEN ? { Authorization: `Bearer ${STATIC_TOKEN}` } : {}),
};

/**
 * Generic typed fetch wrapper with structured error handling.
 * All Directus calls should go through this function.
 */
export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) throw new Error("API base URL is not configured");

  const response = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText || `API Request failed: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText) as {
        errors?: { message: string }[];
      };
      if (errorJson.errors?.[0]?.message) {
        errorMessage = errorJson.errors[0].message;
      }
    } catch {
      // Not JSON — use raw text
    }

    console.error(
      `[Stock Transfer API Error] [${response.status}] ${url}:`,
      errorMessage.substring(0, 200),
    );
    throw new Error(errorMessage);
  }

  if (response.status === 204) return {} as T;

  return (await response.json()) as T;
}

/**
 * Fetch items from a Directus collection with typed response.
 */
export async function fetchItems<T>(
  endpoint: string,
  params: Record<string, unknown> = {},
): Promise<{ data: T[]; meta?: unknown }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleanParams[key] = String(value);
    }
  });

  const queryString = new URLSearchParams(cleanParams).toString();
  const url = `${baseUrl}${cleanEndpoint}${queryString ? `?${queryString}` : ""}`;
  return request<{ data: T[]; meta?: unknown }>(url);
}

/**
 * Fetch a single item from a Directus collection.
 */
export async function fetchItem<T>(
  endpoint: string,
  id: number | string,
  params: Record<string, unknown> = {},
): Promise<{ data: T }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleanParams[key] = String(value);
    }
  });

  const queryString = new URLSearchParams(cleanParams).toString();
  const url = `${baseUrl}${cleanEndpoint}/${id}${queryString ? `?${queryString}` : ""}`;
  return request<{ data: T }>(url);
}

/**
 * Create one or more items in a Directus collection.
 */
export async function createItems<T>(
  endpoint: string,
  payload: unknown,
): Promise<{ data: T }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return request<{ data: T }>(`${baseUrl}${cleanEndpoint}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update a single item in a Directus collection.
 */
export async function updateItem<T>(
  endpoint: string,
  id: number | string,
  payload: unknown,
): Promise<{ data: T }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return request<{ data: T }>(`${baseUrl}${cleanEndpoint}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
<<<<<<< HEAD

/**
 * Bulk-update multiple items in a Directus collection using the
 * PATCH /items/{collection} endpoint with { keys, data } payload.
 * This replaces the N+1 pattern of individual PATCH calls.
 */
export async function bulkUpdateItems<T>(
  endpoint: string,
  ids: (number | string)[],
  data: Record<string, unknown>,
): Promise<{ data: T }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return request<{ data: T }>(`${baseUrl}${cleanEndpoint}`, {
    method: "PATCH",
    body: JSON.stringify({ keys: ids, data }),
  });
}
=======
>>>>>>> origin/master
