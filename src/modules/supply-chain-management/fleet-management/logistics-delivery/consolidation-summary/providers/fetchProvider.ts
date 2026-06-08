import { ClusterGroupRaw } from "../types";

// /api/scm/... is a Next.js internal API route — always use a relative URL.
// NEXT_PUBLIC_API_BASE_URL points to Directus and must NOT be used here.
export const fetchConsolidationSummary = async (startDate: string, endDate: string): Promise<ClusterGroupRaw[]> => {
    const res = await fetch(`/api/scm/fleet-management/logistics-delivery/consolidation-summary?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("Backend Error:", errJson);
        throw new Error(`Failed to fetch consolidation summary: ${errJson.error} - ${errJson.details || res.status}`);
    }
    const result = await res.json();
    return result.data || [];
};
