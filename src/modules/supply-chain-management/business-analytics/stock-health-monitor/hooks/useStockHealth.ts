'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StockHealthData, GlobalFilter } from '../types';
import { toast } from 'sonner';

export function useStockHealth(filters: GlobalFilter) {
    const [data, setData] = useState<StockHealthData | null>(null);
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

            const response = await fetch(`/api/scm/business-analytics/stock-health-monitor?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch stock health data');
            }
            const jsonData = await response.json();
            setData(jsonData);

            if (isManualRefresh) {
                toast.success('Stock health data refreshed');
            } else if (isFirstLoad.current) {
                toast.success('Stock health data loaded');
            }
            isFirstLoad.current = false;
        } catch (err: any) {
            const msg = err.message || 'An error occurred';
            setError(msg);
            toast.error(`Stock Health Error: ${msg}`);
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
