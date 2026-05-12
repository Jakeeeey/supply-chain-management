'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { resolveBranchName } from '../../stock-transfer/services/stock-transfer.helpers';
import type { BranchRow, OrderGroup } from '../../stock-transfer/types/stock-transfer.types';
import { toast } from 'sonner';

interface UseSerializeBaseProps {
  statuses: string[];
  autoFetch?: boolean;
}

const PAGE_SIZE = 10;

/**
 * Base hook for Serialized Stock Transfer hooks with Pagination and Search support.
 */
export function useSerializeBase({ statuses, autoFetch = true }: UseSerializeBaseProps) {
  const [baseOrderGroups, setBaseOrderGroups] = useState<OrderGroup[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Pagination & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const statusesStr = statuses.join(',');

  const fetchTransfers = useCallback(async (currentPage: number, currentSearch: string, isLoadMore = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const url = `/api/scm/warehouse-management/stock-transfer-serialize?action=list_groups&status=${statusesStr}&search=${encodeURIComponent(currentSearch)}&limit=${PAGE_SIZE}&offset=${offset}`;
      
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch transfers (${res.status})`);
      
      const result = await res.json();
      const newGroups = result.data || [];
      
      setHasMore(result.hasMore);
      setBaseOrderGroups(prev => {
        if (!isLoadMore) return newGroups;
        
        // Merge strategy to prevent duplicate keys
        const merged = [...prev];
        newGroups.forEach((newG: OrderGroup) => {
          const existingIdx = merged.findIndex(eg => eg.orderNo === newG.orderNo);
          if (existingIdx > -1) {
            // Append items to existing group
            merged[existingIdx] = {
              ...merged[existingIdx],
              items: [...merged[existingIdx].items, ...newG.items]
            };
          } else {
            merged.push(newG);
          }
        });
        return merged;
      });

      // Fetch branches only once or when needed (simplified for now)
      if (branches.length === 0) {
        const branchRes = await fetch('/api/scm/warehouse-management/stock-transfer?action=branches');
        const branchResult = await branchRes.json();
        setBranches(branchResult.branches || []);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock transfers.';
      console.error('[Serialize Base Hook] Fetch Failed:', err);
      setFetchError(message);
      toast.error('Network Error', { description: message });
    } finally {
      setLoading(false);
    }
  }, [statusesStr, branches.length]);

  // Load plans when search or page changes
  useEffect(() => {
    if (autoFetch) {
      fetchTransfers(page, debouncedSearch, page > 1);
    }
  }, [page, debouncedSearch, autoFetch, fetchTransfers]);

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch]);

  const getBranchName = useCallback(
    (id: number | null) => resolveBranchName(id, branches),
    [branches]
  );

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return baseOrderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, baseOrderGroups]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchTransfers(1, debouncedSearch, false);
  }, [debouncedSearch, fetchTransfers]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(p => p + 1);
    }
  }, [loading, hasMore]);

  return {
    baseOrderGroups,
    branches,
    loading,
    processing,
    setProcessing,
    fetchError,
    
    selectedOrderNo,
    setSelectedOrderNo,
    selectedGroup,
    
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    refresh,
    getBranchName,
  };
}
