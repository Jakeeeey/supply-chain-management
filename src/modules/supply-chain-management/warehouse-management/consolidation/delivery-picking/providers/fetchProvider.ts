"use client";

import { ConsolidatorDto, BranchDto, ConsolidationPreviewItem } from "../types";

// Interface for the Paginated Response
export interface PaginatedConsolidators {
    content: ConsolidatorDto[];
    totalPages: number;
    totalElements: number;
    number: number;
}

// 🚀 HELPER: Centralized Header Generator
const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("vos_token") : "";
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
    };
};

// --- 🏛️ BRANCH API CALLS ---

export const fetchActiveBranches = async (): Promise<BranchDto[] | null> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/branches?_t=${Date.now()}`;
        const response = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store"
        });
        if (response.status === 401) return null;
        if (!response.ok) return [];

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Branch Fetch Error:", error);
        return [];
    }
};

// --- 📦 CONSOLIDATOR API CALLS ---

export const fetchConsolidators = async (
    branchId: number | undefined,
    page = 0,
    size = 50,
    status = "All",
    search = ""
): Promise<PaginatedConsolidators | null> => {

    // 🛡️ FRONTEND GUARD: If no branchId, return empty immediately.
    if (branchId === undefined || branchId === null) {
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }

    try {
        const queryParams = new URLSearchParams({
            branchId: branchId.toString(),
            page: page.toString(),
            size: size.toString(),
            status: status,
            _t: Date.now().toString()
        });

        if (search && search.trim() !== "") {
            queryParams.append("search", search.trim());
        }

        const url = `/api/scm/warehouse-management/consolidation/delivery-picking?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: "GET",
            headers: getHeaders(),
            cache: "no-store"
        });

        if (response.status === 401) return null;

        if (!response.ok) {
            console.error(`VOS ERROR: ${response.status}`);
            return { content: [], totalPages: 0, totalElements: 0, number: 0 };
        }

        const data = await response.json();

        return {
            content: Array.isArray(data.content) ? data.content : [],
            totalPages: Number(data.page?.totalPages ?? data.totalPages ?? 0),
            totalElements: Number(data.page?.totalElements ?? data.totalElements ?? 0),
            number: Number(data.page?.number ?? data.number ?? 0)
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Consolidator Fetch Error:", message);
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }
};

export const fetchConsolidatorSummary = async (): Promise<Record<string, number> | null> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/delivery-picking/summary?_t=${Date.now()}`;
        const response = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store"
        });
        if (response.status === 401) return null;
        if (!response.ok) return {};

        return await response.json();
    } catch {
        console.error("Summary Fetch Error");
        return {};
    }
};

// --- 👷 PICKER ASSIGNMENT API CALLS ---

export async function fetchPickersBySupplier(supplierId: number) {
    try {
        const res = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/pickers/suppliers/${supplierId}`, {
            headers: getHeaders()
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export async function assignPicker(userId: number, supplierId: number) {
    try {
        const res = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/pickers/assign`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ userId, supplierId })
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function unassignPicker(userId: number, supplierId: number) {
    try {
        const res = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/pickers/unassign`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ userId, supplierId })
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function fetchAllActiveSuppliers(supplierType?: string) {
    try {
        const params = new URLSearchParams();
        if (supplierType) params.append("supplierType", supplierType);
        const url = `/api/scm/warehouse-management/consolidation/delivery-picking/pickers/suppliers?${params.toString()}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export async function fetchAllUsers(departmentId?: number) {
    try {
        const params = new URLSearchParams();
        if (departmentId) params.append("departmentId", departmentId.toString());
        const url = `/api/scm/warehouse-management/consolidation/delivery-picking/pickers/users?${params.toString()}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

// --- 🧙 CONSOLIDATION WIZARD API CALLS ---

export const fetchDispatchPlans = async (branchId?: number | string): Promise<unknown[]> => {
    try {
        const params = new URLSearchParams({ status: "Approved" });
        if (branchId) params.append("branchId", branchId.toString());
        const url = `/api/scm/warehouse-management/consolidation/dispatch-plans?${params.toString()}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return data.content || data;
    } catch {
        return [];
    }
};

export const fetchConsolidationPreview = async (dispatchIds: number[]): Promise<ConsolidationPreviewItem[]> => {
    try {
        if (!dispatchIds.length) return [];
        const params = new URLSearchParams({ dispatchIds: dispatchIds.join(','), _t: Date.now().toString() });
        const url = `/api/scm/warehouse-management/consolidation/preview?${params.toString()}`;
        const res = await fetch(url, { headers: getHeaders() });
        return res.ok ? await res.json() : [];
    } catch {
        return [];
    }
};

export const generateConsolidationBatch = async (dispatchIds: number[]): Promise<ConsolidatorDto | null> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/create-batch`;
        const res = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ dispatchIds })
        });
        return res.ok ? await res.json() : null;
    } catch {
        return null;
    }
};

// --- 📱 REAL-TIME SCANNING & WORKFLOW ---

export const startPickingBatch = async (consolidatorNo: string, checkerId: number): Promise<boolean> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/delivery-picking/start`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ consolidatorNo, checkerId }),
        });
        return response.ok;
    } catch {
        return false;
    }
};

export const transmitItemScan = async (payload: {
    detailId: number;
    newPickedQuantity: number;
    rfidTag?: string;
    scannedBy: number;
}): Promise<boolean> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/picking/scan`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        return response.ok;
    } catch {
        return false;
    }
};