import type { Supplier, Branch, Product, DiscountType, PaymentTerm } from "../types";

type Envelope<T> = { data: T };

async function fetchData<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers as Record<string, string>),
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

export async function fetchSuppliers(): Promise<Supplier[]> {
    return fetchData<Supplier[]>(`${BASE}/suppliers`);
}

export async function fetchBranches(): Promise<Branch[]> {
    return fetchData<Branch[]>(`${BASE}/branches`);
}

export async function fetchProducts(params?: { supplierId?: string | number; ids?: Array<string | number> }): Promise<Product[]> {
    const sp = new URLSearchParams();
    if (params?.supplierId !== undefined && params?.supplierId !== null && String(params.supplierId).trim()) {
        sp.set("supplierId", String(params.supplierId));
    }
    if (params?.ids?.length) {
        sp.set("ids", params.ids.map(String).join(","));
    }
    const qs = sp.toString();
    return fetchData<Product[]>(`${BASE}/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProductsByIds(ids: Array<string | number>): Promise<Product[]> {
    return fetchProducts({ ids });
}

export async function fetchProductsBySupplier(supplierId: string | number): Promise<Product[]> {
    return fetchProducts({ supplierId });
}

export async function fetchProductSupplierLinks(supplierId: string | number): Promise<unknown[]> {
    const sp = new URLSearchParams();
    sp.set("supplierId", String(supplierId));
    return fetchData<unknown[]>(`${BASE}/product-supplier-links?${sp.toString()}`);
}

export async function fetchDiscountTypes(): Promise<DiscountType[]> {
    return fetchData<DiscountType[]>(`${BASE}/discount-types`);
}

export async function fetchPaymentTerms(): Promise<PaymentTerm[]> {
    return fetchData<PaymentTerm[]>("/api/scm/supplier-management/payment-terms");
}

/** ✅ Save PO to API route */
export async function createPurchaseOrder(payload: unknown): Promise<unknown> {
    return fetchData<unknown>(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
