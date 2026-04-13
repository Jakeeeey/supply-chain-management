import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface ReceiveItem extends StockTransfer {
  receivedQty: number;
}

export interface ReceiveGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: ReceiveItem[];
  status: string;
  totalAmount: number;
}

export function useStockTransferReceiveManual() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});

  const updateReceivedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setReceivedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const statuses = 'For Loading,In Transit';
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?status=${encodeURIComponent(statuses)}`);
      if (!res.ok) {
        setFetchError('Unable to reach the server.');
        return;
      }
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for manual receive:', err);
      setFetchError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const orderGroups = useMemo(() => {
    const groups: Record<string, ReceiveGroup> = {};
    stockTransfers.forEach((st) => {
      if (!groups[st.order_no]) {
        groups[st.order_no] = {
          orderNo: st.order_no,
          sourceBranch: st.source_branch,
          targetBranch: st.target_branch,
          leadDate: st.lead_date,
          dateRequested: st.date_requested,
          dateEncoded: st.date_encoded || '',
          items: [],
          status: st.status,
          totalAmount: 0
        };
      }
      
      const qty = st.allocated_quantity ?? st.ordered_quantity ?? 0;
      
      groups[st.order_no].items.push({
        ...st,
        receivedQty: receivedQtys[st.id] ?? 0, 
      });
      groups[st.order_no].totalAmount = (groups[st.order_no].totalAmount || 0) + Number(st.amount || 0);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime()
    );
  }, [stockTransfers]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  const getBranchName = useCallback(
    (id: number | null) => {
      if (!id) return 'Unknown';
      const b = branches.find((branch) => branch.id === id);
      return b ? (b.branch_name as string) || (b.name as string) || `Branch ${id}` : `Branch ${id}`;
    },
    [branches]
  );

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    setProcessing(true);
    try {
      const ids = group.items.map((item) => item.id);
      
      const res = await fetch('/api/scm/warehouse-management/stock-transfer/receive-manual', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids, 
          status: 'Received',
          scanType: 'MANUAL_RECEIVE'
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status to Received`);
      }

      toast.success(`Order ${orderNo} successfully received manually.`);
      setSelectedOrderNo(null);
      await fetchTransfers();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong while receiving.');
    } finally {
      setProcessing(false);
    }
  };

  return {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    receiveOrder,
    getBranchName,
    fetchError,
    receivedQtys,
    updateReceivedQty,
    refresh: fetchTransfers,
  };
}
