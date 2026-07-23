const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export function directusHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

export function fieldsParam(fields: readonly string[]) {
  return encodeURIComponent(fields.join(","));
}

export async function directusFetch(path: string, init: RequestInit = {}) {
  if (!DIRECTUS_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return fetch(`${DIRECTUS_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...directusHeaders(),
      ...(init.headers || {}),
    },
  });
}

export async function directusError(res: Response) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

export function asNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function asRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
