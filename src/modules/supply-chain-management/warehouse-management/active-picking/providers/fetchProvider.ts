import { BranchDto, PaginatedPickingBatches, ConsolidatorDto } from "../types";
import {
    PaginatedConsolidators
} from "@/modules/supply-chain-management/warehouse-management/consolidation/delivery-picking/providers/fetchProvider";
import { ConsolidatorDto as DeliveryConsolidatorDto } from "@/modules/supply-chain-management/warehouse-management/consolidation/delivery-picking/types";

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
        const data = await handleResponse<unknown>(response);

        if (!data) return null;

        const d = data as { content?: ConsolidatorDto[]; totalPages?: number; totalElements?: number; number?: number };
        const content = (Array.isArray(d) ? d : (d.content || [])) as ConsolidatorDto[];
        return {
            content,
            totalPages: Number(d.totalPages ?? 1),
            totalElements: Number(d.totalElements ?? content.length),
            number: Number(d.number ?? 0),
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
    } catch {
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

        const data = await handleResponse<unknown>(response);

        if (!data) {
            return { content: [], totalPages: 0, totalElements: 0, number: 0 };
        }

        const d = data as { content?: DeliveryConsolidatorDto[]; page?: { totalPages?: number; totalElements?: number; number?: number }; totalPages?: number; totalElements?: number; number?: number };
        return {
            content: Array.isArray(d.content) ? (d.content as DeliveryConsolidatorDto[]) : [],
            totalPages: Number(d.page?.totalPages ?? d.totalPages ?? 0),
            totalElements: Number(d.page?.totalElements ?? d.totalElements ?? 0),
            number: Number(d.page?.number ?? d.number ?? 0)
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Consolidator Fetch Error:", message);
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }
};
