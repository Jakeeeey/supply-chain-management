// =============================================================================
// DIRECTUS CLIENT — stock-adjustment module
// =============================================================================

/** Returns the Directus base URL (no trailing slash). Throws if not set. */
export function getDirectusBase(): string {
  const raw =
    process.env.DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";
  const cleaned = raw.trim().replace(/\/$/, "");
  if (!cleaned) {
    throw new Error(
      "DIRECTUS_URL is not set. Add it to .env.local and restart the dev server."
    );
  }
  return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

/** Returns the Directus static token. Throws if not set. */
export function getDirectusToken(): string {
  const token = (
    process.env.DIRECTUS_STATIC_TOKEN ||
    process.env.DIRECTUS_TOKEN ||
    ""
  ).trim();
  if (!token) {
    throw new Error(
      "DIRECTUS_STATIC_TOKEN is not set. Add it to .env.local and restart the dev server."
    );
  }
  return token;
}

/** Returns headers for authenticated Directus requests. */
export function directusHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getDirectusToken()}`,
  };
}

/** Fetches a Directus URL with JSON response handling. Throws on non-2xx. */
export async function directusFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...directusHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errors = json?.errors as Array<{ message: string }> | undefined;
    const msg =
      errors?.[0]?.message ||
      (json?.error as string) ||
      `Directus responded ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

/** Helper for Directus GET requests */
export async function directusGet<T>(path: string): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return directusFetch(url, { method: "GET" });
}

/** Helper for Directus POST/PATCH/DELETE requests */
export async function directusMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const options: RequestInit = { method };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return directusFetch(url, options);
}
