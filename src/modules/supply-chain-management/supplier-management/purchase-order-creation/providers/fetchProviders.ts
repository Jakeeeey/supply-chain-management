type Envelope<T> = { data: T };

async function fetchData<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
            "Content-Type": "application/json",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(init?.headers as any),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed ${res.status} ${res.statusText} :: ${url} :: ${text}`);
    }

    const json = await res.json().catch(() => null);

    if (json && typeof json === "object" && "data" in json) {
        return (json as Envelope<T>).data;
    }

    return json as T;
}

const BASE = "/api/scm/supplier-management/purchase-order-creation";

export async function fetchSuppliers() {
    return fetchData<unknown[]>(`${BASE}/suppliers`);
}

export async function fetchBranches() {
    return fetchData<unknown[]>(`${BASE}/branches`);
}

export async function fetchProducts(params?: { supplierId?: string | number; ids?: Array<string | number> }) {
    const sp = new URLSearchParams();

    if (params?.supplierId !== undefined && params?.supplierId !== null && String(params.supplierId).trim()) {
        sp.set("supplierId", String(params.supplierId));
    }

    if (params?.ids?.length) {
        sp.set("ids", params.ids.map(String).join(","));
    }

    const qs = sp.toString();
    return fetchData<unknown[]>(`${BASE}/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProductsByIds(ids: Array<string | number>) {
    return fetchProducts({ ids });
}
export async function fetchProductsBySupplier(supplierId: string | number) {
    return fetchProducts({ supplierId });
}

export async function fetchProductSupplierLinks(supplierId: string | number) {
    const sp = new URLSearchParams();
    sp.set("supplierId", String(supplierId));
    return fetchData<unknown[]>(`${BASE}/product-supplier-links?${sp.toString()}`);
}

export async function fetchDiscountTypes() {
    return fetchData<unknown[]>(`${BASE}/discount-types`);
}

/** ✅ Save PO to API route */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPurchaseOrder(payload: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fetchData<any>(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

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

export async function directusFetch<T = any>(
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
