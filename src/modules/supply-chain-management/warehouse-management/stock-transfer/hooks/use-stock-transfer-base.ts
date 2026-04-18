import { useState, useEffect, useCallback, useMemo } from 'react';
import { stockTransferLifecycleService } from '../services/stock-transfer.lifecycle';
import { groupByOrderNo, resolveBranchName } from '../services/stock-transfer.helpers';
import type { StockTransferRow, BranchRow } from '../types/stock-transfer.types';
import { toast } from 'sonner';

interface UseStockTransferBaseProps {
  statuses: string[];
  autoFetch?: boolean;
}

/**
 * Base hook that centralizes common state and fetching logic for all 
 * stock transfer submodule hooks (Approval, Dispatching, Receive).
 */
export function useStockTransferBase({ statuses, autoFetch = true }: UseStockTransferBaseProps) {
  const [stockTransfers, setStockTransfers] = useState<StockTransferRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  const statusesStr = statuses.join(',');
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await stockTransferLifecycleService.fetchTransfers(statusesStr);
      setStockTransfers(res.stockTransfers ?? []);
      setBranches(res.branches ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock transfers.';
      console.error('[Stock Transfer Base Hook] Fetch Failed:', err);
      setFetchError(message);
      toast.error('Network Error', {
        description: message
      });
    } finally {
      setLoading(false);
    }
  }, [statusesStr]);

  useEffect(() => {
    if (autoFetch) {
      fetchTransfers();
    }
  }, [fetchTransfers, autoFetch]);

  const getBranchName = useCallback(
    (id: number | null) => resolveBranchName(id, branches),
    [branches]
  );

  const baseOrderGroups = useMemo(() => {
    return groupByOrderNo(stockTransfers);
  }, [stockTransfers]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return baseOrderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, baseOrderGroups]);

  return {
    stockTransfers,
    setStockTransfers,
    branches,
    loading,
    setLoading,
    processing,
    setProcessing,
    fetchError,
    
    selectedOrderNo,
    setSelectedOrderNo,
    selectedGroup,
    
    refresh: fetchTransfers,
    getBranchName,
    baseOrderGroups,
  };
}
