/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Low-level HTTP client for the Pre Dispatch Plan module.
 * Mirrors the pattern from bundle-api.ts for consistency.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  ...(STATIC_TOKEN ? { Authorization: `Bearer ${STATIC_TOKEN}` } : {}),
};

/**
 * Generic request helper with standardized error handling.
 * @param url - Full URL to call
 * @param options - Fetch options
 * @returns Parsed JSON response
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
      const errorJson = JSON.parse(errorText);
      if (errorJson.errors?.[0]?.message) {
        errorMessage = errorJson.errors[0].message;
      }
    } catch {
      // Response is not JSON
    }

    console.error(
      `[PDP API Error] [${response.status}] ${url}:`,
      errorMessage.substring(0, 200),
    );
    throw new Error(errorMessage);
  }

  if (response.status === 204) return {} as T;

  return (await response.json()) as T;
}

/**
 * Fetches items from a Directus collection with optional query parameters.
 * @param endpoint - Directus collection endpoint (e.g. /items/dispatch_plan)
 * @param params - Key-value query parameters
 * @returns Data array with optional meta
 */
export async function fetchItems<T>(
  endpoint: string,
  params: Record<string, any> = {},
): Promise<{ data: T[]; meta?: any }> {
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
  return request<{ data: T[]; meta?: any }>(url);
}

/**
 * Helper to fetch items in batches using an '_in' filter.
 * Prevents 431 Request Header Too Large errors when filtering by many IDs.
 */
export async function fetchItemsInChunks<T>(
  endpoint: string,
  filterField: string,
  ids: (string | number)[],
  params: Record<string, any> = {},
  chunkSize: number = 50,
): Promise<{ data: T[] }> {
  // Deduplicate and filter out empty IDs
  const uniqueIds = [...new Set(ids)].filter((id) => id !== null && id !== "");
  if (!uniqueIds.length) return { data: [] };

  const results: T[] = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const chunkParams = {
      ...params,
      [`filter[${filterField}][_in]`]: chunk.join(","),
    };

    const res = await fetchItems<T>(endpoint, chunkParams);
    if (res.data) {
      results.push(...res.data);
    }
  }

  return { data: results };
}
