'use client';

import { useState, useEffect } from 'react';

export interface LookupOption {
    id: string;
    name: string;
}

export interface BiaLookups {
    branches: LookupOption[];
    suppliers: LookupOption[];
}

export function useBiaLookups() {
    const [data, setData] = useState<BiaLookups>({ branches: [], suppliers: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLookups() {
            try {
                const response = await fetch('/api/scm/business-analytics/lookups');
                if (!response.ok) throw new Error('Failed to fetch lookups');
                const json = await response.json();
                setData({
                    branches: json.branches || [],
                    suppliers: json.suppliers || [],
                });
            } catch (err) {
                console.error('[useBiaLookups]', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLookups();
    }, []);

    return { lookups: data, isLoading };
}
