'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InventoryPerformanceData, GlobalFilter } from '../types';
import { toast } from 'sonner';

export function useInventoryPerformance(filters: GlobalFilter) {
    const [data, setData] = useState<InventoryPerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isFirstLoad = useRef(true);

    const fetchData = useCallback(async (isManualRefresh = false) => {
        if (isFirstLoad.current) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters.dateRange.from) params.append('from', filters.dateRange.from.toISOString());
            if (filters.dateRange.to) params.append('to', filters.dateRange.to.toISOString());
            if (filters.branchId) params.append('branchId', filters.branchId);
            if (filters.supplierId) params.append('supplierId', filters.supplierId);

            const response = await fetch(`/api/scm/business-analytics/inventory-performance-dashboard?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch inventory performance data');
            }
            const jsonData = await response.json();
            setData(jsonData);

            if (isManualRefresh) {
                toast.success('Data refreshed successfully');
            } else if (isFirstLoad.current) {
                toast.success('Inventory performance data loaded');
            }
            isFirstLoad.current = false;
        } catch (e: unknown) {
            const err = e as Error; setError(err.message || 'An error occurred');
            toast.error(`Error: ${err.message || 'Failed to load data'}`);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const onFocus = () => fetchData();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchData]);

    const memoizedData = useMemo(() => data, [data]);

    return {
        data: memoizedData,
        isLoading,
        error,
        refresh: () => fetchData(true),
    };
}
