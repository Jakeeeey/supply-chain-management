import { ClusterGroupRaw } from "../types";

export const fetchPendingDeliveries = async (startDate?: string, endDate?: string): Promise<ClusterGroupRaw[]> => {
    let url = "/api/scm/fleet-management/logistics-delivery/pending-deliveries";
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch pending deliveries");
    const result = await res.json();
    return result.data || [];
};
