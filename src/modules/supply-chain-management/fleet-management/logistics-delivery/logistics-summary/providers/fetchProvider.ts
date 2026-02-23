import { LogisticsRecord } from "../types";

export const fetchLogisticsSummary = async (params: { page: number; search?: string; dateFilter?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', params.page.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.dateFilter) searchParams.append('dateFilter', params.dateFilter);
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const res = await fetch(`/api/scm/fleet-management/logistics-delivery/logistics-summary?${searchParams.toString()}`);

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch data');
    }

    return await res.json() as { data: LogisticsRecord[]; meta: { filter_count: number } };
};
