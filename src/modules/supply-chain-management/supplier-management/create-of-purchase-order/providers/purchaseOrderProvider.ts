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

const BASE = "/api/scm/supplier-management/create-of-purchase-order";

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


