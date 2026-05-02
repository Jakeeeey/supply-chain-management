import type { POListItem } from "../types";

type Envelope<T> = { data: T };

async function fetchData<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed ${res.status} ${res.statusText} :: ${url} :: ${text}`);
    }
    const json = await res.json().catch(() => null);
    if (json && typeof json === "object" && "data" in json) return (json as Envelope<T>).data;
    return json as T;
}

const BASE = "/api/scm/supplier-management/purchase-order-posting";

export async function fetchPendingPOs(): Promise<POListItem[]> {
    return fetchData<POListItem[]>(BASE);
}

export async function postPO(id: string | number): Promise<unknown> {
    return fetchData<unknown>(BASE, { method: "POST", body: JSON.stringify({ id }) });
}


