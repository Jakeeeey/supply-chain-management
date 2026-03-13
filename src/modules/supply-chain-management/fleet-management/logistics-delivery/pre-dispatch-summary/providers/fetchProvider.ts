import type { VPreDispatchPlanDetailedDto } from "../types";

const API_BASE = "/api/scm/fleet-management/logistics-delivery/pre-dispatch-summary";

async function http<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const msg = data?.error || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
    }
    return (data ?? {}) as T;
}

// 🚀 Now accepts a status parameter to hit the new Spring Boot logic
export async function fetchPreDispatchByStatus(status: string): Promise<VPreDispatchPlanDetailedDto[]> {
    try {
        const url = new URL(API_BASE, window.location.origin);
        url.searchParams.set("status", status);
        url.searchParams.set("_t", Date.now().toString()); // Cache buster

        return await http<VPreDispatchPlanDetailedDto[]>(url.toString());
    } catch (error) {
        console.error("Pre-Dispatch Fetch Error:", error);
        return [];
    }
}