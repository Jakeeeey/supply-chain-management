export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export const HEADERS = {
  "Content-Type": "application/json",
  ...(STATIC_TOKEN ? { Authorization: `Bearer ${STATIC_TOKEN}` } : {}),
};

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error("API base URL is not configured");
  
  const response = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error [${response.status}]:`, errorText.substring(0, 200)); 
    throw new Error(errorText || `API Request failed: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return {} as T;

  const json = await response.json();
  return json as T;
}

export async function fetchItems<T>(endpoint: string, params: Record<string, any> = {}): Promise<{ data: T[], meta?: any }> {
  const baseUrl = API_BASE_URL?.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const queryString = new URLSearchParams(params).toString();
  const url = `${baseUrl}${cleanEndpoint}${queryString ? `?${queryString}` : ''}`;
  return request<{ data: T[], meta?: any }>(url);
}
