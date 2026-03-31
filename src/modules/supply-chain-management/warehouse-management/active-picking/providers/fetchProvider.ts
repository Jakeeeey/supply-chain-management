import { ConsolidatorDto, BranchDto, PaginatedPickingBatches } from "../types";
import {
    PaginatedConsolidators
} from "@/modules/supply-chain-management/warehouse-management/consolidation/delivery-picking/providers/fetchProvider";

const HEADERS = {
    "Content-Type": "application/json",
};

async function handleResponse<T>(response: Response): Promise<T | null> {
    if (!response.ok) {
        console.error(`VOS ERROR: ${response.status}`);
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        console.error("JSON Parse Error:", error);
        return null;
    }
}

export const fetchActiveBranches = async (): Promise<BranchDto[]> => {
    try {
        const url = new URL("/api/scm/warehouse-management/consolidation/branches", window.location.origin);
        url.searchParams.set("_t", Date.now().toString());
        const response = await fetch(url.toString(), { headers: HEADERS, cache: "no-store" });
        const data = await handleResponse<BranchDto[]>(response);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Branch Fetch Error:", error);
        return [];
    }
};

export const fetchActivePickingBatches = async (
    branchId: number,
    search: string = ""
): Promise<PaginatedPickingBatches | null> => {
    if (!branchId) return null;

    try {
        const url = new URL("/api/scm/warehouse-management/consolidation/delivery-picking", window.location.origin);
        const params = url.searchParams;
        params.set("branchId", branchId.toString());
        params.set("page", "0");
        params.set("size", "50");
        params.set("status", "Picking");
        params.set("_t", Date.now().toString());
        if (search.trim()) {
            params.set("search", search.trim());
        }

        const response = await fetch(url.toString(), { headers: HEADERS, cache: "no-store" });
        const data = await handleResponse<any>(response);

        if (!data) return null;

        const content = Array.isArray(data) ? data : (data.content || []);
        return {
            content,
            totalPages: Number(data.totalPages ?? 1),
            totalElements: Number(data.totalElements ?? content.length),
            number: Number(data.number ?? 0),
        };
    } catch (error) {
        console.error("Batch Fetch Error:", error);
        return null;
    }
};

export async function submitManualPick(payload: {
    batchId: number;
    productId: number;
    quantity: number;
}) {
    const res = await fetch("/api/scm/warehouse-management/consolidation/picking/manual", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Failed to update manual quantity");
    }
    return data;
}

export const transmitItemScan = async (payload: {
    detailId: number;
    rfidTag: string;
    scannedBy?: number;
    newPickedQuantity: number;
}): Promise<{ success: boolean; message?: string }> => {
    try {
        const url = "/api/scm/warehouse-management/consolidation/picking/scan";
        const response = await fetch(url, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { success: false, message: err.message || `HTTP ${response.status} Error` };
        }

        return { success: true };
    } catch (error) {
        return { success: false, message: "Network transmission failed." };
    }
};

export const lookupRfidTag = async (rfidTag: string): Promise<number | null> => {
    try {
        const url = new URL("/api/scm/warehouse-management/consolidation/picking/lookup", window.location.origin);
        url.searchParams.set("rfid", rfidTag);
        const response = await fetch(url.toString());
        const data = await handleResponse<{ productId: number }>(response);
        return data?.productId || null;
    } catch (error) {
        console.error("RFID Lookup Error:", error);
        return null;
    }
};

export const completePickingBatch = async (batchId: number): Promise<boolean> => {
    try {
        const url = "/api/scm/warehouse-management/consolidation/picking/complete";
        const response = await fetch(url, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({ batchId }),
        });
        return response.ok;
    } catch (error) {
        console.error("Batch Completion Error:", error);
        return false;
    }
};

export const fetchConsolidators = async (
    branchId: number | undefined,
    page = 0,
    size = 50,
    status = "All",
    search = ""
): Promise<PaginatedConsolidators> => {
    if (branchId === undefined || branchId === null) {
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }

    try {
        const url = new URL("/api/scm/warehouse-management/consolidation/delivery-picking", window.location.origin);
        const params = url.searchParams;
        params.set("branchId", branchId.toString());
        params.set("page", page.toString());
        params.set("size", size.toString());
        params.set("status", status);
        params.set("_t", Date.now().toString());
        if (search.trim()) {
            params.set("search", search.trim());
        }

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: HEADERS,
            cache: "no-store"
        });

        const data = await handleResponse<any>(response);

        if (!data) {
            return { content: [], totalPages: 0, totalElements: 0, number: 0 };
        }

        return {
            content: Array.isArray(data.content) ? data.content : [],
            totalPages: Number(data.page?.totalPages ?? data.totalPages ?? 0),
            totalElements: Number(data.page?.totalElements ?? data.totalElements ?? 0),
            number: Number(data.page?.number ?? data.number ?? 0)
        };

    } catch (error: any) {
        console.error("Consolidator Fetch Error:", error.message);
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }
};
