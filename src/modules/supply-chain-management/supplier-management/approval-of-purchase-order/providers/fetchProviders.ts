type Envelope<T> = { data: T };

async function fetchData<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers as any) },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed ${res.status} ${res.statusText} :: ${url} :: ${text}`);
    }
    const json = await res.json().catch(() => null);
    if (json && typeof json === "object" && "data" in json) return (json as Envelope<T>).data;
    return json as T;
}

const BASE = "/api/scm/supplier-management/approval-of-purchase-order";

export async function fetchPendingApprovalPOs() {
    return fetchData<any[]>(BASE);
}

export async function fetchPurchaseOrderDetail(id: string | number) {
    return fetchData<any>(`${BASE}?id=${id}`);
}

export async function approvePurchaseOrder(payload: { id: string | number; [key: string]: any }) {
    return fetchData<any>(BASE, { method: "POST", body: JSON.stringify(payload) });
}


