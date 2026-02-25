'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { GlobalFilter } from '../types';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export function useBiaFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filters = useMemo((): GlobalFilter => {
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');

        return {
            dateRange: {
                from: fromStr ? parseISO(fromStr) : startOfMonth(new Date()),
                to: toStr ? parseISO(toStr) : endOfMonth(new Date()),
            },
            branchId: searchParams.get('branchId') || 'all',
            supplierId: searchParams.get('supplierId') || 'all',
        };
    }, [searchParams]);

    const updateFilters = useCallback((newFilters: Partial<GlobalFilter>) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newFilters.dateRange) {
            if (newFilters.dateRange.from) params.set('from', format(newFilters.dateRange.from, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
            if (newFilters.dateRange.to) params.set('to', format(newFilters.dateRange.to, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
        }

        if (newFilters.branchId) params.set('branchId', newFilters.branchId);
        if (newFilters.supplierId) params.set('supplierId', newFilters.supplierId);

        router.push(`${pathname}?${params.toString()}`);
    }, [router, pathname, searchParams]);

    return {
        filters,
        updateFilters,
    };
}
