import {PlanningRow} from "../types";

export async function fetchSuppliers(type?: string): Promise<unknown[]> {
    // If a type is provided (e.g., "Non-Trade"), append it. Otherwise, use the default endpoint.
    const endpoint = type
        ? `/api/scm/inventory-management/inventory-controls/suppliers?type=${encodeURIComponent(type)}`
        : "/api/scm/inventory-management/inventory-controls/suppliers";

    const res = await fetch(endpoint, {cache: "no-store"});
    const data = await res.json();

    // Handle the { ok: false, message: ... } format from your BFF
    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to fetch suppliers");
    }

    return Array.isArray(data) ? data : data.data || [];
}

export async function fetchBranches(): Promise<unknown[]> {
    const res = await fetch("/api/scm/inventory-management/inventory-controls/branches", {cache: "no-store"});
    const data = await res.json();

    // Handle the { ok: false, message: ... } format from your BFF
    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to fetch branches");
    }

    return Array.isArray(data) ? data : data.data || [];
}

export async function fetchInTransitPOs(supplierId: string): Promise<unknown[]> {
    const res = await fetch(`/api/scm/inventory-management/inventory-controls/in-transit?supplierId=${supplierId}`, {cache: "no-store"});
    const data = await res.json();

    // Handle the { ok: false, message: ... } format from your BFF
    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to fetch purchase orders");
    }

    return Array.isArray(data) ? data : data.data || [];
}

/**
 * 🚀 POST: Fetch the fully calculated HISTORICAL Planning Dashboard Data
 */
export async function fetchHistoricalData(payload: {
    supplierId: number;
    branchIds: number[];
    inTransitPoIds: (string | number)[];
    selectedMonths: number[]; // Array of month numbers (1-12)
    selectedYear: number;     // The selected year (e.g., 2026)
}): Promise<PlanningRow[]> {
    const res = await fetch("/api/scm/inventory-management/inventory-controls/load-planning/historical", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to load historical planning data");
    }

    return Array.isArray(data) ? data : data.data || [];
}

/**
 * 🚀 POST: Fetch the fully calculated FORECAST Planning Dashboard Data
 */
export async function fetchForecastData(payload: {
    supplierId: number;
    branchIds: number[];
    inTransitPoIds: (string | number)[];
}): Promise<PlanningRow[]> {
    // Make sure your Next.js BFF route matches this path!
    const res = await fetch("/api/scm/inventory-management/inventory-controls/load-planning/forecast", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to load forecast data");
    }

    return Array.isArray(data) ? data : data.data || [];
}

export interface PoItemPayload {
    productId: number;
    orderQty: number;
    unitCost: number;
}

export interface CreatePoPayload {
    supplierId: number;
    branchId: number;
    remarks: string;
    items: PoItemPayload[];
}

export async function submitPurchaseOrder(payload: CreatePoPayload) {
    const res = await fetch("/api/scm/inventory-management/inventory-controls/purchasing/create-po", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to create Purchase Order");
    }

    return data; // Returns { ok: true, message: "...", poNumber: "PO-..." }
}