import type { Branch, User, Province, City, Barangay, SubscriptionLimit } from "../types";

export async function fetchBranches(): Promise<{ 
    branches: Branch[]; 
    users: User[]; 
    subscriptionLimit?: SubscriptionLimit;
}> {
    const res = await fetch("/api/scm/inventory-management/branch-management");
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
}

export async function fetchUsers(): Promise<User[]> {
    // This is now handled by fetchBranches or a dedicated fetchInitialData
    // For compatibility with the current hook, I'll keep it but redirect to the proxy
    const res = await fetch("/api/scm/inventory-management/branch-management");
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = await res.json();
    return data.users || [];
}

export async function saveBranch(branchData: Record<string, unknown>): Promise<unknown> {
    const res = await fetch("/api/scm/inventory-management/branch-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to save branch");
    }
    return res.json();
}

/** 
 * Philippine Location APIs (PSGC)
 * Source: https://psgc.gitlab.io/api/
 */

export const NCR_REGION_CODE = "130000000";

export async function fetchProvinces(): Promise<Province[]> {
    const res = await fetch("https://psgc.gitlab.io/api/provinces");
    if (!res.ok) return [];
    const provinces: Province[] = await res.json();
    // PSGC models Metro Manila as a region with no province, so NCR branches would
    // otherwise have no province to select; surface it as a province-level option.
    return [{ code: NCR_REGION_CODE, name: "National Capital Region" }, ...provinces];
}

export async function fetchCities(provinceCode: string): Promise<City[]> {
    const url = provinceCode === NCR_REGION_CODE
        ? `https://psgc.gitlab.io/api/regions/${provinceCode}/cities-municipalities`
        : `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
}

export async function fetchBarangays(cityCode: string): Promise<Barangay[]> {
    const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays`);
    if (!res.ok) return [];
    return res.json();
}

export async function updateBranch(id: number, branchData: Record<string, unknown>): Promise<unknown> {
    const res = await fetch("/api/scm/inventory-management/branch-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...branchData }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to update branch");
    }
    return res.json();
}

export async function deleteBranch(id: number): Promise<unknown> {
    const res = await fetch(`/api/scm/inventory-management/branch-management?id=${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to delete branch");
    }
    return res.json();
}
