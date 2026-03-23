import { ConsolidatorDto, BranchDto, PaginatedPickingBatches } from "../types";
import {
    PaginatedConsolidators
} from "@/modules/supply-chain-management/warehouse-management/consolidation/delivery-picking/providers/fetchProvider";

/**
 * 🚀 Note: For BFF routes, the Authorization token is handled
 * automatically by the Next.js Route Handler via cookies.
 */
const getHeaders = () => ({
    "Content-Type": "application/json",
});

// --- 🏛️ BRANCH SELECTION ---
export const fetchActiveBranches = async (): Promise<BranchDto[]> => {
    try {
        // Points to your BFF route
        const url = `/api/scm/warehouse-management/consolidation/branches?_t=${Date.now()}`;
        const response = await fetch(url, { headers: getHeaders(), cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Branch Fetch Error:", error);
        return [];
    }
};

// --- 📦 BATCH FETCHING ---
export const fetchActivePickingBatches = async (
    branchId: number,
    search: string = ""
): Promise<PaginatedPickingBatches | null> => {
    if (!branchId) return null;

    try {
        const params = new URLSearchParams({
            branchId: branchId.toString(),
            page: "0",
            size: "50",
            status: "Picking",
            _t: Date.now().toString()
        });

        if (search.trim()) params.append("search", search.trim());

        // Ensure this URL matches your BFF folder structure
        const url = `/api/scm/warehouse-management/consolidation/delivery-picking?${params.toString()}`;
        const response = await fetch(url, { headers: getHeaders(), cache: "no-store" });

        if (!response.ok) return null;
        const data = await response.json();

        // 💡 Support both raw array and Spring Page objects
        const content = Array.isArray(data) ? data : (data.content || []);

        return {
            content: content,
            totalPages: Number(data.totalPages ?? 1),
            totalElements: Number(data.totalElements ?? content.length),
            number: Number(data.number ?? 0)
        };
    } catch (error) {
        console.error("Batch Fetch Error:", error);
        return null;
    }
};

// --- 📱 REAL-TIME RFID/BARCODE SCANNING ---
/**
 * 🚀 This hits your new BFF POST route:
 * /api/scm/warehouse-management/consolidation/picking/scan/route.ts
 */
// --- 📱 REAL-TIME RFID/BARCODE SCANNING ---

export async function submitManualPick(payload: {
    batchId: number;
    productId: number;
    quantity: number;
}) {
    const res = await fetch("/api/scm/warehouse-management/consolidation/picking/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
}): Promise<{ success: boolean; message?: string }> => { // 🚀 Changed return type
    try {
        const url = `/api/scm/warehouse-management/consolidation/picking/scan`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Safely parse the error without throwing console.error
            const err = await response.json().catch(() => ({}));
            return { success: false, message: err.message || `HTTP ${response.status} Error` };
        }

        return { success: true };
    } catch (error) {
        return { success: false, message: "Network transmission failed." };
    }
};

// --- 🔍 BLIND RFID LOOKUP ---
export const lookupRfidTag = async (rfidTag: string): Promise<number | null> => {
    try {
        const response = await fetch(`/api/scm/warehouse-management/consolidation/picking/lookup?rfid=${rfidTag}`);
        if (!response.ok) return null;

        const data = await response.json();
        return data.productId || null;
    } catch (error) {
        console.error("RFID Lookup Error:", error);
        return null;
    }
};

// --- ✅ COMPLETE BATCH ---
export const completePickingBatch = async (batchId: number): Promise<boolean> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/picking/complete`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
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

    } catch (error: any) {
        console.error("Consolidator Fetch Error:", error.message);
        return { content: [], totalPages: 0, totalElements: 0, number: 0 };
    }
};
