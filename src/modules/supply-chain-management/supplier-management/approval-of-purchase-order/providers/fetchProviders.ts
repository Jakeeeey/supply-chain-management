import type { PendingApprovalPO, PurchaseOrderDetail } from "../types";

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

const BASE = "/api/scm/supplier-management/approval-of-purchase-order";

export async function fetchPendingApprovalPOs(): Promise<PendingApprovalPO[]> {
    return fetchData<PendingApprovalPO[]>(BASE);
}

export async function fetchPurchaseOrderDetail(id: string | number): Promise<PurchaseOrderDetail> {
    return fetchData<PurchaseOrderDetail>(`${BASE}?id=${id}`);
}

export async function approvePurchaseOrder(payload: {
    id: string | number;
    approverId?: number;
    [key: string]: unknown;
}): Promise<unknown> {
    const { approverId, ...rest } = payload;
    return fetchData<unknown>(BASE, {
        method: "POST",
        body: JSON.stringify({
            ...rest,
            approver_id: approverId,
        }),
    });
}


