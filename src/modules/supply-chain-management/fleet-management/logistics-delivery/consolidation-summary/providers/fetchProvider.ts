import { ClusterGroupRaw } from "../types";

// /api/scm/... is a Next.js internal API route — always use a relative URL.
// NEXT_PUBLIC_API_BASE_URL points to Directus and must NOT be used here.
export const fetchConsolidationSummary = async (): Promise<ClusterGroupRaw[]> => {
    const res = await fetch("/api/scm/fleet-management/logistics-delivery/consolidation-summary");
    if (!res.ok) throw new Error("Failed to fetch consolidation summary");
    const result = await res.json();
    return result.data || [];
};
