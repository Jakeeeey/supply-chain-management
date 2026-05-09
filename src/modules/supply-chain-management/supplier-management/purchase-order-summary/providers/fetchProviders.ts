// =============================================================================
// SERVER-SIDE DIRECTUS HELPERS (For API Routes)
// =============================================================================

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

export function directusHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getDirectusToken()}`,
    };
}

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

export async function directusGet<T>(path: string): Promise<T> {
    const base = getDirectusBase();
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return directusFetch(url, { method: "GET" });
}

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
