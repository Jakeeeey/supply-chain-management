import { ConsolidatorDto, BranchDto, PaginatedPickingBatches } from "../types";

const getHeaders = () => ({
    "Content-Type": "application/json",
});

export const fetchActiveBranches = async (): Promise<BranchDto[]> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/branches?_t=${Date.now()}`;
        const response = await fetch(url, { headers: getHeaders(), cache: "no-store" });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Branch Fetch Error:", error);
        return [];
    }
};

export const fetchConsolidators = async (
    branchId: number,
    page: number = 0,
    size: number = 50,
    status: string = "Picked",
    search: string = ""
): Promise<PaginatedPickingBatches | null> => {
    if (!branchId) return null;

    try {
        const params = new URLSearchParams({
            branchId: branchId.toString(),
            page: page.toString(),
            size: size.toString(),
            status: status,
            _t: Date.now().toString()
        });

        if (search.trim()) params.append("search", search.trim());

        const url = `/api/scm/warehouse-management/consolidation/delivery-picking?${params.toString()}`;
        const response = await fetch(url, { headers: getHeaders(), cache: "no-store" });

        if (!response.ok) return null;
        const data = await response.json();

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

// --- ✅ COMPLETE AUDIT ---
export const completeAuditBatch = async (batchId: number): Promise<boolean> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/audit/complete`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ batchId }),
        });
        return response.ok;
    } catch (error) {
        console.error("Audit Completion Error:", error);
        return false;
    }
};

// --- 🔄 REPICK BATCH (Status Rollback) ---
// 🚀 ADD THIS TO YOUR FILE
export const repickBatch = async (batchId: number): Promise<boolean> => {
    try {
        const url = `/api/scm/warehouse-management/consolidation/audit/repick`;
        const response = await fetch(url, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ batchId }),
        });
        return response.ok;
    } catch (error) {
        console.error("Repick API Error:", error);
        return false;
    }
};